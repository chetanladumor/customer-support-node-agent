import { prisma } from "./src/db/prisma";

async function main() {
  const res = await fetch("http://localhost:3000/api/chat/messages", {
    method: "POST",
    headers: {
      "X-User-Id": "user_sarah_2",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "What are my active orders?" }],
      id: "cm_test_1"
    })
  });
  console.log("Status:", res.status);
}
main();
