import { prisma } from "../db/prisma.js";
import type { AgentType, MessageRole, ConversationState } from "../shared/types.js";

// ---------------------------------------------------------------------------
// Chat Service
// ---------------------------------------------------------------------------
// Handles saving and retrieving messages and conversation history from Prisma.
// ---------------------------------------------------------------------------

export class ChatService {
  /**
   * Ensure a conversation exists, or create a new one.
   */
  static async getOrCreateConversation(conversationId: string | undefined, userId: string) {
    if (conversationId) {
      const existing = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (existing && existing.userId === userId) {
        return existing;
      }
    }

    // Create new
    return prisma.conversation.create({
      data: {
        userId,
        title: "New Support Ticket",
      },
    });
  }

  /**
   * Save a single message to the database
   */
  static async saveMessage(data: {
    conversationId: string;
    role: MessageRole;
    content: string;
    agentType?: AgentType;
    reasoningSteps?: any;
    toolCalls?: any;
    metadata?: ConversationState;
  }) {
    return prisma.message.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        agentType: data.agentType as any,
        // Prisma expects JSON to be passed directly as an object/array,
        // or as Prisma.JsonNull if undefined. We default to null if undefined.
        reasoningSteps: data.reasoningSteps || null,
        toolCalls: data.toolCalls || null,
        metadata: data.metadata ? (data.metadata as any) : null,
      },
    });
  }

  /**
   * Fetch the last N messages of a conversation to build LLM context
   */
  static async getConversationHistory(conversationId: string, limit = 10) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Return in chronological order for the LLM
    return messages.reverse();
  }
}
