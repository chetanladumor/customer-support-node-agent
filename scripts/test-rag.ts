import { RagService } from "../src/services/rag.service.js";
import { prisma } from "../src/db/prisma.js";

async function main() {
  console.log("Testing Advanced RAG with Cross-Encoder Reranker...");

  // Mock a user context
  const tenantId = "default_tenant";
  const country = "MX";
  const language = "spanish";
  const query = "¿Cuántos días tengo para devolver mi paquete?";

  console.log(`\nQuery: "${query}"\n`);

  try {
    const results = await RagService.searchKnowledgeBase(query, tenantId, country, language);

    console.log("\n=== FINAL RERANKED TOP CONTEXTS ===");
    results.forEach((r, idx) => {
      console.log(`\n[${idx + 1}] Score: ${r.score} | Title: ${r.title}`);
      console.log(`Snippet: ${r.content.substring(0, 150)}...`);
    });
  } catch (error) {
    console.error("Error running RAG test:", error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
