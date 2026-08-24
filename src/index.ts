import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";

const port = Number(process.env.PORT) || 3001;

app.listen(port, () => {
  console.log(`🚀 Node AI Customer Support API is running on http://localhost:${port}`);
  console.log(`📖 Health Check: http://localhost:${port}/api/health`);
  console.log(`🤖 Agents Directory: http://localhost:${port}/api/agents`);
});
