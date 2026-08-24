import { prisma } from "../src/db/prisma.js";

async function main() {
  console.log("Applying GIN and HNSW indexes for Production RAG...");

  // 1. Create GIN Index for Full-Text Search
  console.log("Creating GIN index for keyword search...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "chunk_fts_idx" 
    ON "KnowledgeBaseChunk" USING GIN (to_tsvector('english', content));
  `);
  console.log("✅ GIN Index created successfully.");

  // 2. Create HNSW Index for Vector Search
  console.log("Creating HNSW index for vector search...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "chunk_hnsw_idx" 
    ON "KnowledgeBaseChunk" USING hnsw (embedding vector_cosine_ops);
  `);
  console.log("✅ HNSW Index created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
