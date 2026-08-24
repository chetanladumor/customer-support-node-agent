import { prisma } from "./src/db/prisma";
async function main() {
  const convs = await prisma.conversation.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { messages: true } });
  console.log(JSON.stringify(convs, null, 2));
}
main();
