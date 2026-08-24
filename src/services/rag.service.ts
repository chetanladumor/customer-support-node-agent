import { prisma } from "../db/prisma.js";
import { EmbeddingFactory } from "./embedding.factory.js";
import { RerankerService, RerankerCandidate } from "./reranker.service.js";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const ollama = createOpenAI({
  baseURL: "http://host.docker.internal:11434/v1",
  apiKey: "ollama",
});

export interface RagSearchResult {
  chunkId: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  score: number;
  // Debug metadata for interview demonstration
  vectorRank?: number | null;
  keywordRank?: number | null;
  rrfScore?: number;
  rerankerScore?: number;
}

/**
 * RagService
 * Orchestrates the full Advanced Retrieval-Augmented Generation pipeline.
 * 
 * WHY WE USE THIS PIPELINE IN PRODUCTION:
 * 1. Query Rewriting: Translates vague user chat into highly optimized search queries.
 * 2. Hybrid Search (Vector + Keyword): Vector search finds semantic meaning (e.g., "return" ≈ "refund").
 *    Keyword search finds exact matches (e.g., "Error Code 504"). We combine them.
 * 3. Tenant Filtering: Ensures users only see articles they are permitted to see (Multi-tenant DB isolation).
 * 4. RRF (Reciprocal Rank Fusion): A mathematically proven way to merge Vector and Keyword scores without score normalization bias.
 */
export class RagService {
  /**
   * Rewrites the user query to optimize for vector/keyword retrieval.
   */
  private static async rewriteQuery(query: string, history: string = ""): Promise<string> {
    console.log(`[RAG] Rewriting query: "${query}"`);
    const { text } = await generateText({
      model: ollama("llama3.1"), // Fast model for rewriting
      system: `You are a search query optimizer. Given the user's question and conversation history, extract the core search intent. Output ONLY the search query keywords, nothing else. No conversational text.`,
      prompt: `History: ${history}\n\nUser: ${query}\n\nOptimized Search Query:`,
    });
    return text.trim();
  }

  /**
   * Executes the full RAG retrieval pipeline.
   */
  static async searchKnowledgeBase(
    query: string,
    tenantId: string,
    country?: string,
    language: string = 'english',
    history: string = ""
  ): Promise<RagSearchResult[]> {
    console.log(`\n[RAG] Starting advanced retrieval pipeline for tenant ${tenantId}...`);
    const optimizedQuery = await this.rewriteQuery(query, history);
    console.log(`[RAG] Optimized Query: "${optimizedQuery}"`);

    // 2. Generate Vector for Optimized Query
    const queryVector = await EmbeddingFactory.generateEmbedding(optimizedQuery);
    const vectorString = `[${queryVector.join(",")}]`;

    // 3. Execute Hybrid Search (Vector + Full-Text) with Tenant Filtering via Prisma Raw
    // We use RRF (Reciprocal Rank Fusion) by assigning a rank score: 1 / (k + rank)
    const k = 60; // Standard constant for RRF

    // Note: We use PostgreSQL `@@ to_tsquery` for keyword search and `<=>` for Cosine Distance in pgvector.
    const searchResults: any[] = await prisma.$queryRawUnsafe(`
      WITH vector_search AS (
        SELECT 
          c.id AS "chunkId",
          k.id AS "kbId",
          k.title,
          c.content,
          ROW_NUMBER() OVER (ORDER BY c.embedding <=> $1::vector) AS rank
        FROM "KnowledgeBaseChunk" c
        JOIN "KnowledgeBase" k ON c."knowledgeBaseId" = k.id
        WHERE k."tenantId" = $2 AND (k.country = $3 OR k.country IS NULL)
        ORDER BY c.embedding <=> $1::vector
        LIMIT 20
      ),
      keyword_search AS (
        SELECT 
          c.id AS "chunkId",
          k.id AS "kbId",
          k.title,
          c.content,
          ROW_NUMBER() OVER (ORDER BY ts_rank(c.search_vector, plainto_tsquery($6::regconfig, $4)) DESC) AS rank
        FROM "KnowledgeBaseChunk" c
        JOIN "KnowledgeBase" k ON c."knowledgeBaseId" = k.id
        WHERE k."tenantId" = $2 AND (k.country = $3 OR k.country IS NULL)
          AND c.search_vector @@ plainto_tsquery($6::regconfig, $4)
        LIMIT 20
      )
      SELECT 
        COALESCE(v."chunkId", k."chunkId") AS "chunkId",
        COALESCE(v."kbId", k."kbId") AS "knowledgeBaseId",
        COALESCE(v.title, k.title) AS title,
        COALESCE(v.content, k.content) AS content,
        v.rank AS vector_rank,
        k.rank AS keyword_rank,
        (
          COALESCE(1.0 / (60 + v.rank), 0.0) +
          COALESCE(1.0 / (60 + k.rank), 0.0)
        ) AS rrf_score
      FROM vector_search v
      FULL OUTER JOIN keyword_search k ON v."chunkId" = k."chunkId"
      ORDER BY rrf_score DESC
      LIMIT 30
    `, vectorString, tenantId, country, optimizedQuery, k, language);

    console.log(`\n[RAG DEBUG] RRF Results (Top 5 shown):`);
    searchResults.slice(0, 5).forEach((r, idx) => {
      console.log(`  [${idx + 1}] RRF Score: ${(r.rrf_score).toFixed(4)} | Vector Rank: ${r.vector_rank || 'N/A'} | Keyword Rank: ${r.keyword_rank || 'N/A'} | Title: ${r.title}`);
    });

    // 4. Cross-Encoder Reranker
    // This takes the Top 5 candidates from RRF and re-scores them for exact semantic alignment with the query.
    // It filters it down to the Top 2 absolute best contexts for the LLM.
    const candidates: RerankerCandidate[] = searchResults.map(r => ({
      chunkId: r.chunkId,
      knowledgeBaseId: r.knowledgeBaseId,
      title: r.title,
      content: r.content,
      score: r.rrf_score,
      rrfScore: r.rrf_score,
      vectorRank: r.vector_rank ? Number(r.vector_rank) : null,
      keywordRank: r.keyword_rank ? Number(r.keyword_rank) : null,
    }));

    const topContexts = await RerankerService.rerank(optimizedQuery, candidates, 2);

    return topContexts;
  }
}
