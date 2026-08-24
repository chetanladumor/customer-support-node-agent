import { prisma } from "./src/db/prisma";

async function main() {
  const userId = "user_chetan_1"; // Assuming this is the user ID
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });
    console.log("Conversations loaded successfully:", conversations.length);
  } catch (e) {
    console.error("Prisma error:", e);
  }
}
main();
