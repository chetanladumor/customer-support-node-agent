# Node AI Customer Support System

Enterprise Multi-Agent AI Customer Support Platform — Node.js + Express + PostgreSQL + pgvector

## Advanced RAG (Retrieval-Augmented Generation) Architecture

This project implements an enterprise-grade RAG pipeline to ensure the AI's answers are grounded in internal knowledge, strictly permissioned, and highly relevant.

### Pipeline Flow
`Question -> Auth -> Tenant/Country Filtering -> Query Rewriting -> Hybrid Search -> RRF -> Context -> LLM`

### Key Production Strategies Used:
1. **Dynamic Embedding Factory:** (`src/services/embedding.factory.ts`) We abstracted the embedding generation. In production, this allows hot-swapping models (e.g., from OpenAI to local Ollama `nomic-embed-text`) without rewriting application logic. Currently uses 768 dimensions (industry standard for open-source embeddings).
2. **Document Chunking Strategy:** (`src/services/ingestion.service.ts`) Rather than embedding a massive 3-page document (which dilutes semantic meaning), we use a Fixed-Size Chunking strategy with overlap. This guarantees that each vector strictly represents a narrow topic, dramatically improving retrieval accuracy.
3. **Query Rewriting (Pre-Retrieval):** (`src/services/rag.service.ts`) User queries in chat are often vague (e.g. "how do I do it?"). We use a fast LLM pass to analyze the conversation history and rewrite the user's input into an optimized, keyword-rich search query before executing the search.
4. **Tenant & Regional Filtering:** By passing the `userId` down to the RAG tool, we fetch the user's `tenantId` and `country`. The SQL search query enforces these filters, guaranteeing data isolation (crucial for B2B multi-tenant systems).
5. **Hybrid Search & RRF (Reciprocal Rank Fusion):** We execute both a Vector Semantic Search (`<=>` operator via pgvector) and a Full-Text Keyword Search (`@@ to_tsquery`). To merge them fairly without score normalization bias, we calculate an RRF score directly within PostgreSQL.

### Step-by-Step Implementation Guide
1. **Database Schema Updates:** Added `tenantId` and `country` to the `User` and `KnowledgeBase` models to support multi-tenant isolation. Created `KnowledgeBaseChunk` with `vector(768)` to store granular document fragments.
2. **Provider Abstraction:** Created `EmbeddingFactory` to wrap Vercel AI SDK's `embed` functions, allowing seamless switching between local Ollama embeddings and external providers like OpenAI.
3. **Ingestion Service:** Built `IngestionService.ingestArticle` to automate the splitting of knowledge base articles into 1000-character chunks with a 200-character overlap. It generates embeddings and inserts them using Prisma `$executeRawUnsafe`.
4. **RAG Service:** Built the `RagService.searchKnowledgeBase` orchestrator. It uses an LLM to rewrite the query based on chat history, generates the vector, and executes a complex PostgreSQL CTE (Common Table Expression) to perform the Hybrid Search and compute the RRF score on the fly.
5. **Agent Integration:** Hooked the RAG service into the `SUPPORT` sub-agent via the `searchKnowledgeBase` tool. By passing the `userId` from the chat session dynamically down to the tool, the backend securely applies the user's tenant and regional filters to the RAG search.
