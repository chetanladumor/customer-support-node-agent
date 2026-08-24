import { embed, embedMany, EmbeddingModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

/**
 * EmbeddingFactory
 * Provides a dynamic way to retrieve the appropriate embedding model based on environment config.
 * In a production RAG system, the ability to hot-swap embedding models (e.g. falling back to
 * local Ollama if OpenAI is rate-limited, or testing different models) without rewriting
 * application code is crucial.
 */
export class EmbeddingFactory {
  /**
   * Returns the configured Vercel AI SDK EmbeddingModel.
   */
  static getModel() {
    const provider = process.env.EMBEDDING_PROVIDER || "ollama";
    
    switch (provider.toLowerCase()) {
      case "openai":
        // e.g. text-embedding-3-small (1536 dims)
        const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
        return openai.textEmbeddingModel(process.env.EMBEDDING_MODEL || "text-embedding-3-small");
        
      case "google":
        // e.g. text-embedding-004 (768 dims)
        return google.textEmbeddingModel(process.env.EMBEDDING_MODEL || "text-embedding-004");
        
      case "ollama":
      default:
        // By default, we use local Ollama with nomic-embed-text (768 dims)
        // host.docker.internal is used so the backend container can reach the host's Ollama instance.
        const ollama = createOpenAI({
          baseURL: "http://host.docker.internal:11434/v1",
          apiKey: "ollama",
        });
        return ollama.textEmbeddingModel(process.env.EMBEDDING_MODEL || "nomic-embed-text");
    }
  }

  /**
   * Helper to generate a single embedding array for a given text.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const model = this.getModel();
    const { embedding } = await embed({
      model,
      value: text,
    });
    return embedding;
  }

  /**
   * Helper to generate embeddings for an array of text chunks.
   */
  static async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const model = this.getModel();
    const { embeddings } = await embedMany({
      model,
      values: texts,
    });
    return embeddings;
  }
}
