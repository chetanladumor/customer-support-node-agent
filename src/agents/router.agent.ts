import { streamText, isStepCount } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { ClassifierAgent } from "./classifier.agent.js";
import { ContextManager } from "./context.manager.js";
import { getSubAgents } from "./sub.agents.js";
import { ChatService } from "../services/chat.service.js";
import type { AgentType, ReasoningStep, ToolCallRecord, SendMessageResponse } from "../shared/types.js";

const ollama = createOpenAI({
  baseURL: "http://host.docker.internal:11434/v1",
  apiKey: "ollama",
});

export class RouterAgent {
  static async handleIncomingMessageStream(
    conversationId: string,
    userId: string,
    userMessage: string
  ) {
    const reasoningSteps: ReasoningStep[] = [];
    
    // 1. Fetch History & Context
    const history = await ChatService.getConversationHistory(conversationId, 6);
    const historyText = history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const previousState = await ContextManager.getConversationState(conversationId);

    // 2. Classify Intent
    const classification = await ClassifierAgent.classifyIntent(userMessage, historyText);
    const selectedAgentType = classification.agentType;

    // 3. Delegate to Sub-Agent
    const subAgentsConfig = getSubAgents(userId);
    const subAgentConfig = subAgentsConfig[selectedAgentType as keyof typeof subAgentsConfig] || subAgentsConfig.SUPPORT;
    const systemPromptWithContext = ContextManager.buildSystemPrompt(subAgentConfig.systemPrompt, previousState);

    const coreMessages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    coreMessages.push({ role: "user", content: userMessage });

    let selectedModel: any;
    try {
      await fetch("http://host.docker.internal:11434/");
      selectedModel = ollama("llama3.1");
      console.log("[ROUTER] Using local Ollama model");
    } catch (e) {
      console.log("[ROUTER] Local Ollama not available, falling back to Google API");
      selectedModel = google(process.env.AI_MODEL || "gemini-3.6-flash");
    }

    // Call the AI SDK with streamText
    const result = streamText({
      model: selectedModel,
      system: systemPromptWithContext,
      messages: coreMessages,
      tools: subAgentConfig.tools as any,
      stopWhen: isStepCount(5),
      onFinish: async ({ text, toolCalls, toolResults }) => {
        const formattedToolCalls: ToolCallRecord[] = [];
        
        if (toolCalls && toolCalls.length > 0) {
          for (const rawTc of toolCalls) {
            const tc = rawTc as any;
            formattedToolCalls.push({
              id: tc.toolCallId,
              name: tc.toolName,
              args: tc.args || {},
              timestamp: new Date().toISOString(),
            });
          }
        }
        
        // Save the generated response to the database
        const newState = ContextManager.extractNewState(userMessage, text, previousState, selectedAgentType);
        
        await ChatService.saveMessage({
          conversationId,
          role: "assistant",
          content: text || "",
          agentType: selectedAgentType,
          reasoningSteps,
          toolCalls: formattedToolCalls,
          metadata: newState,
        });
      },
      onError: ({ error }) => {
        console.error("[RouterAgent] Error during streamText:", error);
        if (error instanceof Error) {
          console.error("Stack trace:", error.stack);
        } else {
          console.error("Unknown error object:", JSON.stringify(error));
        }
      },
    });

    return result;
  }
}
