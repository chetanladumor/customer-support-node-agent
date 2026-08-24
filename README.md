<div align="center">
  <h1>🤖 Enterprise Multi-Agent AI Customer Support</h1>
  <p><strong>A production-ready AI orchestration platform built with Node.js, Vercel AI SDK, and PostgreSQL (pgvector).</strong></p>
</div>

---

## 📖 Overview

This project is an advanced, multi-agent customer support backend. Instead of relying on a single monolithic LLM prompt, it uses a **Router Agent** to classify user intent and delegate tasks to specialized **Sub-Agents** (Order Agent, Billing Agent, Support Agent). 

The platform features an **Enterprise-Grade Multilingual RAG (Retrieval-Augmented Generation) Pipeline** for answering policy questions, backed by a hybrid search engine in PostgreSQL.

## 🚀 Key Features

- **Multi-Agent Orchestration:** 
  - `Classifier Agent`: Evaluates intents using Zod-enforced JSON schemas.
  - `Router Agent`: Delegates tasks and maintains persistent conversation state.
  - `Sub-Agents`: Specialized agents equipped with specific live-database tools (e.g., `getOrderStatus`, `searchKnowledgeBase`).
- **Advanced RAG Pipeline:**
  - **Query Rewriting:** Extracts core search intent from conversational chat.
  - **Pre-Filtering:** Isolates data by `tenantId` (multi-tenancy) and `country` before vector math.
  - **Hybrid Search:** Executes a single PostgreSQL CTE query combining **Vector Search** (`pgvector` / `HNSW`) and **Full-Text Keyword Search** (GIN Index).
  - **Reciprocal Rank Fusion (RRF):** Mathematically merges vector and keyword results to eliminate score-normalization bias.
  - **Multilingual Support:** Database triggers automatically cast language-specific dictionaries (English, Spanish, French) for perfect GIN word-stemming.
  - **LLM-as-a-Judge Reranker:** A Cross-Encoder step that forces the LLM to read the Top 30 RRF candidates and score them 0-100 for absolute precision.
- **Dynamic Embedding Factory:** Easily hot-swap between local Ollama (`nomic-embed-text`) and OpenAI/Google models with zero application code changes.
- **Live Database Integration:** Real-time PostgreSQL tool execution for Order Tracking and Invoice lookups.

## 🛠️ Technology Stack

- **Backend:** Node.js, Express, TypeScript, Zod
- **AI / LLM:** Vercel AI SDK, Ollama (Local), Google Gemini (Fallback)
- **Database:** PostgreSQL (with `pgvector`)
- **ORM:** Prisma

---

## ⚙️ Local Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker & Docker Compose](https://www.docker.com/) (for PostgreSQL + pgvector)
- [Ollama](https://ollama.com/) (Optional, if running local models)

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5455/swadesh_support_db?schema=public"

# AI Providers (Optional if using Ollama)
OPENAI_API_KEY="sk-..."
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."

# Environment Config
EMBEDDING_PROVIDER="ollama" 
EMBEDDING_MODEL="nomic-embed-text"
AI_MODEL="gemini-3.6-flash"
```

### 3. Start Database & Install Dependencies
Start the PostgreSQL container:
```bash
docker compose up -d
```
Install Node modules:
```bash
npm install
```

### 4. Database Schema & Vector Indexes
Push the Prisma schema to the database:
```bash
npm run db:push
```
Run the setup script to create the explicit `search_vector` column, GIN indexes, and Database Triggers for Hybrid Search:
```bash
npx tsx scripts/add-explicit-search-vector.ts
```

### 5. Seed & Ingest Knowledge Base
Seed the database with mock Customers, Orders, and Multilingual Knowledge Base articles:
```bash
npm run db:seed
```
Run the ingestion script to chunk the documents and generate vector embeddings:
```bash
npx tsx scripts/ingest-all.ts
```

### 6. Start the Server
```bash
npm run dev
```

---

## 🧪 Testing the RAG Pipeline

You can directly test the Hybrid Search + Reranker pipeline via the CLI test script. This bypasses the chat interface to give you vivid debug output of the RRF scores, Vector Ranks, and Keyword Ranks.

```bash
npx tsx scripts/test-rag.ts
```

## 🏗️ Architecture Design (RAG)
```mermaid
graph TD;
    A[User Query] --> B[Query Rewriter]
    B --> C{Tenant/Country Filter}
    C --> D[HNSW Vector Search]
    C --> E[GIN Keyword Search]
    D --> F[Reciprocal Rank Fusion]
    E --> F
    F --> G(Top 30 Candidates)
    G --> H[LLM Cross-Encoder Reranker]
    H --> I(Top 2 Contexts)
    I --> J[Final LLM Generation]
```
