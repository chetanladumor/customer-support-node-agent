import { prisma } from "../src/db/prisma.js";

async function main() {
  console.log("Setting up explicit search_vector column and GIN index...");

  // 1. Add the tsvector column
  console.log("Adding search_vector column...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "KnowledgeBaseChunk" 
    ADD COLUMN IF NOT EXISTS "search_vector" tsvector;
  `);

  // 2. Drop the old functional index if it exists
  console.log("Dropping old functional GIN index...");
  await prisma.$executeRawUnsafe(`
    DROP INDEX IF EXISTS "chunk_fts_idx";
  `);

  // 3. Create the GIN index on the new explicit column
  console.log("Creating GIN index on search_vector column...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "chunk_search_vector_idx" 
    ON "KnowledgeBaseChunk" USING GIN ("search_vector");
  `);

  // 4. Update existing rows
  console.log("Populating search_vector for existing rows...");
  await prisma.$executeRawUnsafe(`
    UPDATE "KnowledgeBaseChunk" 
    SET "search_vector" = to_tsvector("language"::regconfig, "content")
    WHERE "search_vector" IS NULL;
  `);

  // 5. Create a trigger function to auto-update search_vector on insert/update
  console.log("Creating trigger function for auto-updating search_vector...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION update_chunk_search_vector() 
    RETURNS trigger AS $$
    BEGIN
      NEW.search_vector := to_tsvector(NEW.language::regconfig, NEW.content);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 6. Attach the trigger to the table
  console.log("Dropping old trigger if exists...");
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS tsvectorupdate ON "KnowledgeBaseChunk";
  `);
  
  console.log("Attaching new trigger to KnowledgeBaseChunk...");
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER tsvectorupdate 
    BEFORE INSERT OR UPDATE ON "KnowledgeBaseChunk"
    FOR EACH ROW EXECUTE FUNCTION update_chunk_search_vector();
  `);

  console.log("✅ Explicit search_vector column, GIN index, and triggers created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
