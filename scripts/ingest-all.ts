import { prisma } from "../src/db/prisma.js";
import { IngestionService } from "../src/services/ingestion.service.js";

async function main() {
  console.log("Starting full database ingestion...");

  const articles = await prisma.knowledgeBase.findMany();
  console.log(`Found ${articles.length} articles to ingest.`);

  for (const article of articles) {
    console.log(`Ingesting article: ${article.title}...`);
    try {
      await IngestionService.ingestArticle(article.id);
    } catch (e) {
      console.error(`Failed to ingest article ${article.id}:`, e);
    }
  }

  console.log("✅ Full ingestion complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
