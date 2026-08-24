import { ChatService } from "../services/chat.service.js";
import type { ConversationState, AgentType } from "../shared/types.js";

/**
 * ContextManager solves Bug #4 (Follow-Up Questions Lose Context).
 * It extracts contextual entities from the latest conversation state and merges it
 * with new incoming messages to ensure the AI remembers active Order or Invoice IDs.
 */
export class ContextManager {
  static async getConversationState(conversationId: string): Promise<ConversationState> {
    const history = await ChatService.getConversationHistory(conversationId, 10);
    
    // Find the most recent assistant message that has metadata
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.metadata) {
        return msg.metadata as unknown as ConversationState;
      }
    }

    // Default empty state
    return {
      lastMentionedOrderId: null,
      lastMentionedInvoiceId: null,
      lastAgent: null,
      recentTopic: null,
    };
  }

  static buildSystemPrompt(basePrompt: string, state: ConversationState): string {
    let contextStr = `\n\n--- ACTIVE CONVERSATION CONTEXT ---\n`;
    let hasContext = false;

    if (state.lastMentionedOrderId) {
      contextStr += `- Active Order ID: ${state.lastMentionedOrderId}\n`;
      hasContext = true;
    }
    if (state.lastMentionedInvoiceId) {
      contextStr += `- Active Invoice ID: ${state.lastMentionedInvoiceId}\n`;
      hasContext = true;
    }

    if (!hasContext) return basePrompt;

    return basePrompt + contextStr + `If the user asks a follow-up question (e.g. "where is it?", "cancel it"), assume they are referring to the Active IDs listed above unless they specify otherwise.`;
  }

  /**
   * Helper to update the state based on what the user just asked or what the AI responded
   */
  static extractNewState(
    userMessage: string,
    aiResponseText: string,
    previousState: ConversationState,
    currentAgent: AgentType
  ): ConversationState {
    const newState = { ...previousState, lastAgent: currentAgent };

    // Simple regex extraction for our standard formats
    const orderMatch = (userMessage + " " + aiResponseText).match(/ORDER-\d{4}/i);
    if (orderMatch) {
      newState.lastMentionedOrderId = orderMatch[0].toUpperCase();
    }

    const invoiceMatch = (userMessage + " " + aiResponseText).match(/INV-\d{4}-\d{3}/i);
    if (invoiceMatch) {
      newState.lastMentionedInvoiceId = invoiceMatch[0].toUpperCase();
    }

    return newState;
  }
}
