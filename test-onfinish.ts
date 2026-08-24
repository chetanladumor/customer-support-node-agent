import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const ollama = createOpenAI({ baseURL: "http://127.0.0.1:11434/v1", apiKey: "ollama" });

async function main() {
  const result = streamText({ 
    model: ollama("llama3.1"), 
    messages: [{ role: "user", content: "Hi" }],
    onFinish: async (event) => {
      console.log("toolResults:", event.toolResults);
    }
  });
  
  // consume stream
  for await (const chunk of result.textStream) {}
}
main();
