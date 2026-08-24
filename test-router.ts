import { RouterAgent } from "./src/agents/router.agent.js";
import { ChatService } from "./src/services/chat.service.js";
import { prisma } from "./src/db/prisma.js";

async function main() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");
    const conv = await ChatService.getOrCreateConversation("test-conv-ai", user.id);
    console.log("Got conv:", conv.id);
    const stream = await RouterAgent.handleIncomingMessageStream(conv.id, user.id, "What are my active orders?");
    const reader = stream.textStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      process.stdout.write(value);
    }
  } catch (e) {
    console.error("CAUGHT ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
