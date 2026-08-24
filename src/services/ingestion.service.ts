import { prisma } from "../db/prisma.js";
import { EmbeddingFactory } from "./embedding.factory.js";
import { randomUUID } from "crypto";

/**
 * IngestionService
 * Handles the processing of raw Knowledge Base articles into searchable vector chunks.
 * 
 * WHY CHUNKING?
 * When embedding large documents (like a 3-page return policy), the semantic meaning of individual
 * sentences gets diluted into a single vector. By chunking the document into smaller pieces (e.g., 500 characters),
 * each chunk's vector highly represents a specific topic, making retrieval incredibly accurate.
 * 
 * FIXED-SIZE vs SEMANTIC CHUNKING:
 * - Fixed-Size (Used here): Splits by character count with overlap. Fast, reliable, and guarantees chunk sizes.
 *   Overlap ensures context isn't lost if a sentence is split midway.
 * - Semantic Chunking: Uses an LLM or NLP to split by paragraphs or topics. More accurate but slower and costly.
 *   For production speed, Fixed-Size with a smart overlap is the industry standard baseline.
 */
export class IngestionService {
  /**
   * Processes an article by chunking it, embedding the chunks, and saving them to the database.
   */
  static async ingestArticle(knowledgeBaseId: string) {
    const article = await prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });

    if (!article) throw new Error("Article not found");

    // 1. Delete existing chunks if re-ingesting
    await prisma.knowledgeBaseChunk.deleteMany({
      where: { knowledgeBaseId },
    });

    // 2. Perform Fixed-Size Chunking with Overlap
    const chunkSize = 1000;
    const overlap = 200;
    const chunks = this.chunkText(article.content, chunkSize, overlap);

    // 3. Generate Embeddings dynamically via our factory
    console.log(`[Ingestion] Generating embeddings for ${chunks.length} chunks...`);
    const embeddings = await EmbeddingFactory.generateEmbeddings(chunks);

    // 4. Save Chunks + Embeddings to Database using Prisma raw query for pgvector
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = randomUUID(); // Fallback ID generation
      const vectorString = `[${embeddings[i].join(",")}]`;

      // We use $executeRawUnsafe because pgvector requires specific syntax to insert vectors
      await prisma.$executeRawUnsafe(`
        INSERT INTO "KnowledgeBaseChunk" ("id", "knowledgeBaseId", "chunkIndex", "content", "embedding", "language", "createdAt")
        VALUES ($1, $2, $3, $4, $5::vector, $6, NOW())
      `, chunkId, knowledgeBaseId, i, chunks[i], vectorString, article.language);
    }

    console.log(`[Ingestion] Successfully ingested ${chunks.length} chunks for article ${knowledgeBaseId}`);
  }

  /**
   * Helper function to chunk text by character length with overlap.
   */
  private static chunkText(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      chunks.push(text.slice(i, i + size));
      i += size - overlap;
    }
    return chunks;
  }
}
