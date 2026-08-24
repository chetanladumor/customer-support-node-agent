import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { prisma } from "../db/prisma.js";

export class EmbeddingService {
  /**
   * Generates a 768-dimensional vector embedding for the given text
   * using Google's text-embedding-004 model.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: google.textEmbeddingModel("gemini-embedding-2"),
      value: text,
    });
    return embedding;
  }

  /**
   * Performs a semantic similarity search against the KnowledgeBase table
   * using the pgvector <=> operator (Cosine Distance).
   */
  static async searchKnowledgeBase(query: string, limit = 2) {
    const queryEmbedding = await this.generateEmbedding(query);
    
    // We must format the array as a Postgres vector string '[0.1, 0.2, ...]'
    const vectorString = `[${queryEmbedding.join(",")}]`;

    // 1 - (distance) gives us a similarity score where 1.0 is a perfect match
    const results = await prisma.$queryRaw`
      SELECT id, category, title, content, 
             1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM "KnowledgeBase"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${limit};
    `;
    
    return results;
  }

  /**
   * Updates a specific article with a new embedding.
   * Required because Prisma cannot natively write to Unsupported("vector") columns.
   */
  static async updateArticleEmbedding(id: string, textToEmbed: string) {
    const embedding = await this.generateEmbedding(textToEmbed);
    const vectorString = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      UPDATE "KnowledgeBase"
      SET embedding = ${vectorString}::vector
      WHERE id = ${id};
    `;
    return true;
  }
}
