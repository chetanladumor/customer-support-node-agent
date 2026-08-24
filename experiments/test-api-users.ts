import { prisma } from "./src/db/prisma";

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users:", users.map(u => u.id));
}
main();
