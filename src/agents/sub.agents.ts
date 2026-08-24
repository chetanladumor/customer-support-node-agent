import { z } from "zod";
import { tool } from "ai";
import { DatabaseTools } from "../tools/database.tools.js";

// ---------------------------------------------------------------------------
// Sub-Agents Configuration
// ---------------------------------------------------------------------------
// These are the specialized agents. We define their system prompts and
// the specific tools they are allowed to use.
// ---------------------------------------------------------------------------

export const getSubAgents = (userId: string) => ({
  ORDER: {
    systemPrompt: `You are the Order Support Agent for Node AI Customer Support.
Your job is to help customers track their packages, check delivery dates, and cancel orders.
Be highly concise and professional. Do NOT invent order numbers. If the user asks for their orders, use listUserOrders to find them.`,
    tools: {
      getOrderStatus: {
        description: "Fetch live details for a specific order (status, tracking, items)",
        parameters: z.object({
          orderNumber: z.string().describe("The order number (e.g. ORDER-1001)"),
        }),
        execute: async (args: { orderNumber: string }) => {
          return await DatabaseTools.getOrderStatus({ ...args, userId });
        },
      },
      listUserOrders: {
        description: "Fetch a list of all recent orders for the user. Call this when the user asks for their orders but doesn't provide an order number.",
        parameters: z.object({}),
        execute: async () => {
          return await DatabaseTools.listUserOrders({ userId });
        },
      },
    },
  },

  BILLING: {
    systemPrompt: `You are the Billing Agent for Node AI Customer Support.
Your job is to assist users with invoices, payments, and billing-related inquiries.
You have access to live database tools to look up invoices by Invoice Number or Order Number.`,
    tools: {
      getInvoiceDetails: {
        description: "Fetch live details for a specific invoice (amount, due date, status)",
        parameters: z.object({
          invoiceNumber: z.string().describe("The invoice number (e.g. INV-2024-001)"),
        }),
        execute: async (args: { invoiceNumber: string }) => {
          return await DatabaseTools.getInvoiceDetails({ ...args, userId });
        },
      },
      getInvoiceByOrder: {
        description: "Fetch live invoice details associated with a specific Order ID",
        parameters: z.object({
          orderNumber: z.string().describe("The order number (e.g. ORDER-1003)"),
        }),
        execute: async (args: { orderNumber: string }) => {
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
});
