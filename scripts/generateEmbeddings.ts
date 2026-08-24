import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { EmbeddingService } from "../src/services/embedding.service.js";

async function main() {
  console.log("🔍 Fetching existing Knowledge Base articles without embeddings...");

  // We can select all fields except 'embedding' via native Prisma
  const articles = await prisma.knowledgeBase.findMany({
    select: { id: true, title: true, content: true },
  });

  if (articles.length === 0) {
    console.log("⚠️ No articles found in the database. Did you run the seed script?");
    return;
  }

  console.log(`Found ${articles.length} articles. Generating embeddings...`);

  for (const article of articles) {
    console.log(`- Embedding: "${article.title}"`);
    // Create a rich text representation for the embedding model
    const textToEmbed = `Title: ${article.title}\nContent: ${article.content}`;
    await EmbeddingService.updateArticleEmbedding(article.id, textToEmbed);
  }

  console.log("✅ All articles have been successfully embedded and saved to pgvector!");
}

main()
  .catch((e) => {
    console.error("❌ Error generating embeddings:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
