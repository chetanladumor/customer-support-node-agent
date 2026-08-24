import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import type { ClassificationResult, AgentType } from "../shared/types.js";

const ollama = createOpenAI({
  baseURL: "http://host.docker.internal:11434/v1",
  apiKey: "ollama",
});

/**
 * ClassifierAgent solves Bug #2 (Router Confusion) and Bug #3 (Binary Routing).
 * Instead of asking the LLM to just chat, we force it to output a strongly typed
 * JSON object using Zod. This guarantees a single, mathematically scored pipeline.
 */
export class ClassifierAgent {
  static async classifyIntent(
    userMessage: string,
    conversationHistory: string
  ): Promise<ClassificationResult> {
    
    // Zod schema defines exactly the JSON shape we want back from the LLM
    const classificationSchema = z.object({
      scores: z.object({
        ORDER: z.number().min(0).max(100).describe("Score (0-100) for how likely this is an order tracking, shipping status, or cancellation query"),
        BILLING: z.number().min(0).max(100).describe("Score (0-100) for how likely this is a payment, invoice, or billing query"),
        SUPPORT: z.number().min(0).max(100).describe("Score (0-100) for how likely this is a general policy (including returns/refunds/devoluciones), technical, or troubleshooting query"),
        GREETING: z.number().min(0).max(100).describe("Score (0-100) for how likely this is a simple greeting or hello"),
      }),
      rationale: z.string().describe("A brief 1-sentence explanation of why you scored it this way"),
    });
    let object: any;
    try {
      await fetch("http://host.docker.internal:11434/");
      const result = await generateObject({
        model: ollama("llama3.1"),
        schema: classificationSchema,
        prompt: `
          Analyze the following user message and classify the intent.
          Assign a confidence score (0-100) to each of the three specialist agents.
          
          CRITICAL RULES:
          - If the user asks about returning an item, return policies, refunds, or warranties (e.g. "What is the return policy?", "devoluciones"), give SUPPORT a score of 100 and ORDER a 0.
          - If the user asks where their package is or wants to cancel an active order, give ORDER a score of 100.
          
          Recent Conversation Context:
          ${conversationHistory}
          
          User Message: "${userMessage}"
        `,
      });
      object = result.object;
      console.log("[CLASSIFIER] Successfully classified using local Ollama model");
    } catch (error) {
      console.log("[CLASSIFIER] Local Ollama model failed. Falling back to Google API...", (error as Error).message);
      const result = await generateObject({
        model: google(process.env.AI_MODEL || "gemini-3.6-flash"),
        schema: classificationSchema,
        prompt: `
          Analyze the following user message and classify the intent.
          Assign a confidence score (0-100) to each of the three specialist agents.
          
          CRITICAL RULES:
          - If the user asks about returning an item, return policies, refunds, or warranties (e.g. "What is the return policy?", "devoluciones"), give SUPPORT a score of 100 and ORDER a 0.
          - If the user asks where their package is or wants to cancel an active order, give ORDER a score of 100.
          
          Recent Conversation Context:
          ${conversationHistory}
          
          User Message: "${userMessage}"
        `,
      });
      object = result.object;
    }
    // Determine the highest scoring agent
    let bestAgent: AgentType = "FALLBACK";
    let highestScore = 0;

    for (const [agent, score] of Object.entries(object.scores as Record<string, number>)) {
      if (score > highestScore) {
        highestScore = score;
        bestAgent = agent as AgentType;
      }
    }

    // If no score is above 40, we fallback to prevent hallucinations
    if (highestScore < 40) {
      bestAgent = "FALLBACK";
    }

    return {
      agentType: bestAgent,
      confidence: highestScore,
      rationale: object.rationale,
      scores: {
        ORDER: object.scores.ORDER,
        BILLING: object.scores.BILLING,
        SUPPORT: object.scores.SUPPORT,
        GREETING: object.scores.GREETING,
        ROUTER: 0,
        FALLBACK: 0,
      },
    };
  }
}
