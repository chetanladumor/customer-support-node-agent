# Advanced RAG Pipeline — Interview Preparation Guide

This document is designed to help you explain the Retrieval-Augmented Generation (RAG) pipeline you built during your technical interview. It covers the architecture, the "why" behind your engineering decisions, and areas for future scale.

---

## 1. How The Pipeline Works (Step-by-Step)

When a user asks a question (e.g., *"How many days do I have to return my broken headphones?"*), the system executes a highly optimized pipeline before the LLM ever sees the prompt.

### Step 1: Query Rewriting
- **What it does:** Users chat conversationally, which is terrible for database search. The system first sends the raw chat to a fast LLM (Llama 3.1) to extract the core search intent (e.g., `"return window broken headphones"`).
- **Why it’s Enterprise-Grade:** Raw user queries often lack context. Rewriting ensures the search engine looks for the actual *intent*, dramatically reducing hallucination rates caused by bad context retrieval.

### Step 2: Tenant & Metadata Filtering (Pre-Filtering)
- **What it does:** Before executing any vector math, the system filters the database by `tenantId` (the company the user belongs to) and `country`.
- **Why it’s Enterprise-Grade:** Security and relevance. You cannot allow User A to retrieve private documents from Company B. Doing this *before* vector search (pre-filtering) saves immense compute cost compared to filtering after retrieval (post-filtering).

### Step 3: Hybrid Search (Vector + Keyword)
- **What it does:** The system executes two searches simultaneously in a single PostgreSQL query using CTEs (Common Table Expressions):
  - **Vector Search (pgvector + HNSW):** Finds semantic meaning. It calculates the cosine distance between the user's query vector and the document vectors. (e.g., It knows "refund" is semantically similar to "money back").
  - **Keyword Search (GIN Index + TSVector):** Finds exact keyword matches. It uses standard PostgreSQL full-text search to find exact part numbers or error codes (e.g., "Error 504") which vector models are notoriously bad at catching.

### Step 4: Reciprocal Rank Fusion (RRF)
- **What it does:** It mathematically combines the results from the Vector Search and Keyword Search. 
- **Why it’s Enterprise-Grade:** Vector scores (cosine similarity 0.8) and Keyword scores (TF-IDF rank 12.5) are on completely different mathematical scales and cannot be directly added. RRF ignores the raw scores and instead scores them based on their *rank* in each list using the formula: `1.0 / (Constant + Rank)`. This is the industry gold standard for Hybrid Search.

### Step 5: Cross-Encoder Reranker (LLM-as-a-Judge)
- **What it does:** Hybrid search retrieves a wide net of 30 candidates. We then pass those 30 chunks, alongside the user's query, back to the LLM. The LLM acts as a "judge" and scores each chunk from 0-100 based on exact relevance, filtering it down to the Top 2 absolute best chunks.
- **Why it’s Enterprise-Grade:** Standard vector search (Bi-Encoders) encodes the query and document separately, which is fast but misses deep semantic overlap. Cross-Encoders evaluate them *together*. By only running this heavy operation on the top 30 candidates, we get maximum accuracy without destroying latency.

### Step 6: LLM Generation & Citations
- **What it does:** The Top 2 perfectly curated chunks are injected into the final system prompt. The LLM generates the final answer grounded *strictly* in that context, and attaches citations linking back to the original `KnowledgeBase` article IDs.

---

## 2. Why This is "Production-Level"

If an interviewer asks why your system is production-ready, highlight these specific engineering decisions:

1. **Database Indexes for Scale:**
   - You didn't just use sequential scans. You implemented an **HNSW (Hierarchical Navigable Small World)** index for vectors. This turns an $O(N)$ scan into an $O(\log N)$ graph traversal, allowing the database to search millions of vectors in milliseconds.
   - You implemented a **GIN Index** on an explicit `search_vector` column, updated automatically via **PostgreSQL Triggers**, ensuring keyword search is instantly resolved without on-the-fly computation.
2. **Dynamic Embedding Factory:**
   - Your system uses the Factory Pattern (`EmbeddingFactory`). It is not hardcoded to OpenAI. Depending on the environment config, it can instantly hot-swap to local Ollama (`nomic-embed-text`) to save costs, or OpenAI (`text-embedding-3`) for higher dimensions, with zero application code changes.
3. **Fixed-Size Chunking with Overlap:**
   - During ingestion, you chunked documents at 1000 characters with a 200-character overlap. The overlap ensures that if a critical sentence sits right on the boundary of a chunk, the context isn't lost.
4. **Data Isolation (Multi-Tenancy):**
   - Built from day one to support multiple companies (Tenants) on a single database securely.

---

## 3. What is Missing? (How to scale it further)

If an interviewer asks, *"How would you improve this?"* or *"What is missing for a Fortune 500 deployment?"*, here is how you answer to show senior-level foresight:

1. **Dedicated Vector Database vs. PostgreSQL:**
   - *Current:* We use `pgvector` inside PostgreSQL. It's fantastic because it keeps relational data (Users, Articles) and vector data in one place, avoiding data-sync issues.
   - *Improvement:* At billions of vectors, `pgvector` can become a bottleneck. We would eventually migrate to a dedicated distributed vector database like **Pinecone, Milvus, or Qdrant**.
2. **Semantic Chunking:**
   - *Current:* We split text blindly every 1000 characters (Fixed-size).
   - *Improvement:* Implement Semantic Chunking (using NLP) to split documents naturally at paragraph breaks or topic changes. This ensures a chunk contains exactly one cohesive thought.
3. **Dedicated Cross-Encoder Model (Latency Optimization):**
   - *Current:* We use Llama 3.1 (LLM-as-a-judge) for the Reranker. It is highly accurate but introduces latency because text generation is slower than classification.
   - *Improvement:* Deploy a dedicated, compiled Cross-Encoder model (like `Cohere Rerank` or `BAAI/bge-reranker-v2-m3`) running on a dedicated GPU instance. It outputs a classification float instantly.
4. **Cache Layer (Semantic Caching):**
   - *Current:* Every question goes through the whole pipeline.
   - *Improvement:* Implement **Redis Semantic Caching**. If User B asks "What's the refund policy?", we embed the question and check Redis. If the vector is 99% similar to User A's question from 5 minutes ago, we instantly return the cached response, saving immense LLM compute costs.
5. **Asynchronous Message Queues for Ingestion:**
   - *Current:* Ingestion (chunking/embedding) happens synchronously.
   - *Improvement:* Use **RabbitMQ or Apache Kafka** to queue document ingestion. When an admin updates an article, an event is published, and a background worker processes the embeddings so the main API thread is never blocked.
