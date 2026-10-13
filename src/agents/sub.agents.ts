import { z } from "zod";
import { tool } from "ai";
import { DatabaseTools } from "../tools/database.tools.js";

// ---------------------------------------------------------------------------
// Sub-Agents Configuration
// ---------------------------------------------------------------------------
// These are the specialized agents. We define their system prompts and
// the specific tools they are allowed to use.
// ---------------------------------------------------------------------------

export interface UserProfileContext {
  id: string;
  name?: string;
  email?: string;
}

export const getSubAgents = (userOrId: UserProfileContext | string) => {
  const user: UserProfileContext = typeof userOrId === "string" ? { id: userOrId, name: "Customer" } : userOrId;
  const userId = user.id;
  const customerName = user.name || "Customer";

  return {
  ORDER: {
    systemPrompt: `You are the Order Support Agent for Node AI Customer Support.
You are assisting the verified authenticated customer: "${customerName}" (Account ID: "${userId}").

CRITICAL PRIVACY & SECURITY RULES:
- You are strictly authorized to view, discuss, and track orders ONLY for the authenticated customer "${customerName}".
- If the user asks for orders, tracking, or items belonging to any other person (e.g. "give me the order of Sarah Jenkins", or any other person's name), you MUST STRICTLY REFUSE.
- Your refusal must be polite, firm, and state: "For privacy and account security reasons, I can only provide order information for your verified account (${customerName}). I cannot access or share information belonging to other customers."
- NEVER call the listUserOrders tool if the user is asking about someone else's orders.
- If the customer asks for their OWN orders (e.g. "my orders", "what did I order", "show orders for ${customerName}"), use the listUserOrders tool.
- Be highly concise and professional. Do NOT invent order numbers.`,
    tools: {
      getOrderStatus: {
        description: "Fetch live details for a specific order (status, tracking, items) belonging to this customer",
        parameters: z.object({
          orderNumber: z.string().optional().describe("The order number (e.g. ORDER-1001)"),
          id: z.string().optional().describe("Alias for order number (e.g. ORDER-1001)"),
          orderId: z.string().optional().describe("Alias for order number (e.g. ORDER-1001)"),
        }),
        execute: async (args: { orderNumber?: string; id?: string; orderId?: string }) => {
          return await DatabaseTools.getOrderStatus({ ...args, userId });
        },
      },
      listUserOrders: {
        description: "Fetch a list of all recent orders for the verified customer. ONLY call this when the customer asks for their OWN orders. NEVER call this for other people.",
        parameters: z.object({}),
        execute: async () => {
          return await DatabaseTools.listUserOrders({ userId });
        },
      },
    },
  },

  BILLING: {
    systemPrompt: `You are the Billing Agent for Node AI Customer Support.
You are assisting the verified authenticated customer: "${customerName}" (Account ID: "${userId}").

CRITICAL PRIVACY & SECURITY RULES:
- You are strictly authorized to view, discuss, and check invoices/payments ONLY for the authenticated customer "${customerName}".
- If the user asks for billing or invoice details for any other person or account, you MUST STRICTLY REFUSE for privacy and account security reasons.
- You have access to live database tools to look up invoices by Invoice Number or Order Number strictly for "${customerName}".`,
    tools: {
      getInvoiceDetails: {
        description: "Fetch live details for a specific invoice (amount, due date, status)",
        parameters: z.object({
          invoiceNumber: z.string().optional().describe("The invoice number (e.g. INV-2024-001)"),
          id: z.string().optional().describe("Alias for invoice number (e.g. INV-2024-001)"),
          invoiceId: z.string().optional().describe("Alias for invoice number (e.g. INV-2024-001)"),
        }),
        execute: async (args: { invoiceNumber?: string; id?: string; invoiceId?: string }) => {
          return await DatabaseTools.getInvoiceDetails({ ...args, userId });
        },
      },
      getInvoiceByOrder: {
        description: "Fetch live invoice details associated with a specific Order ID",
        parameters: z.object({
          orderNumber: z.string().optional().describe("The order number (e.g. ORDER-1003)"),
          id: z.string().optional().describe("Alias for order number (e.g. ORDER-1003)"),
          orderId: z.string().optional().describe("Alias for order number (e.g. ORDER-1003)"),
        }),
        execute: async (args: { orderNumber?: string; id?: string; orderId?: string }) => {
          return await DatabaseTools.getInvoiceByOrder({ ...args, userId });
        },
      },
    },
  },

  SUPPORT: {
    systemPrompt: `You are the Technical Support & Policy Agent for Node AI Customer Support.
Your job is to answer questions about return policies, warranties, and basic troubleshooting.
Always use the searchKnowledgeBase tool to find official policy information before answering.`,
    tools: {
      searchKnowledgeBase: {
        description: "Search the official company knowledge base for policies, terms, and troubleshooting guides. ALWAYS specify the language the user is chatting in.",
        parameters: z.object({
          query: z.string().describe("The search query (e.g. 'return policy', 'shipping times')"),
          language: z.string().optional().describe("The language of the user's query (e.g. 'english', 'spanish', 'french')"),
        }),
        execute: async (args: { query: string, language?: string }) => {
          return await DatabaseTools.searchKnowledgeBase({ ...args, userId });
        },
      },
    },
  },

  GREETING: {
    systemPrompt: `You are a friendly Customer Support greeter.
The user just said hello or greeted you. 
Acknowledge their greeting warmly and ask how you can help them today with their orders, billing, or policies.
Do NOT use any tools. Keep it brief.`,
    tools: {},
  },

  FALLBACK: {
    systemPrompt: `You are a helpful Customer Support agent.
The user asked something that we don't have a specific tool for, or the query is ambiguous.
Politely inform them that you can help with Orders, Billing, and general Policies. Ask them to clarify their question.
Do NOT use any tools. Keep it brief.`,
    tools: {},
  },
  };
};
