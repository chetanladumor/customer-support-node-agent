import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const ollama = createOpenAI({
  baseURL: "http://host.docker.internal:11434/v1",
  apiKey: "ollama",
});

export interface RerankerCandidate {
  chunkId: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  score: number;
  rrfScore?: number;
  rerankerScore?: number;
  vectorRank?: number | null;
  keywordRank?: number | null;
}

/**
 * RerankerService
 * Uses LLM-as-a-Judge to re-score the initial Candidate Set retrieved by RRF.
 * 
 * WHY A RERANKER?
 * - Bi-Encoders (Vector Search) encode the query and document separately. It's extremely fast but misses fine-grained semantic overlap.
 * - This Cross-Encoder approach uses the LLM to read the query and the retrieved context TOGETHER, 
 *   scoring relevance from 0-100. This provides incredible accuracy for the final context window.
 */
export class RerankerService {
  /**
   * Reranks the candidates using LLM-as-a-Judge.
   */
  static async rerank(query: string, candidates: RerankerCandidate[], topK: number = 2): Promise<RerankerCandidate[]> {
    if (!candidates || candidates.length === 0) return [];

    console.log(`[Reranker] Scoring ${candidates.length} candidates against query: "${query}" using LLM-as-a-Judge...`);

    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const { text } = await generateText({
            model: ollama("llama3.1"),
            system: `You are an expert search relevance judge. You will be given a User Query and a Document Snippet.
Rate how relevant the Document Snippet is to answering the User Query on a scale of 0 to 100.
Respond with ONLY the integer score. No explanation, no text, just the number.`,
            prompt: `User Query: "${query}"\n\nDocument Snippet: "${candidate.content}"\n\nScore (0-100):`,
          });
          
          const parsedScore = parseInt(text.trim(), 10);
          return {
            ...candidate,
            score: isNaN(parsedScore) ? 0 : parsedScore,
            rerankerScore: isNaN(parsedScore) ? 0 : parsedScore
          };
        } catch (e) {
          console.error(`[Reranker] Failed to score candidate ${candidate.chunkId}:`, e);
          return { ...candidate, score: 0 };
        }
      })
    );

    // Sort by highest score first and slice to topK
    const finalCandidates = scoredCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`[Reranker] Returned top ${finalCandidates.length} ultra-relevant chunks.`);
    return finalCandidates;
  }
}

