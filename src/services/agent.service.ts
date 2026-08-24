import type { AgentType, AgentInfo } from "../shared/types.js";

// ---------------------------------------------------------------------------
// Agent Service
// ---------------------------------------------------------------------------
// Central registry of all AI Agents in our system.
// In Phase 7, each of these will correspond to an actual Vercel AI SDK class.
// ---------------------------------------------------------------------------

export const AGENT_REGISTRY: AgentInfo[] = [
  {
    type: "ROUTER",
    name: "Router Agent",
    description: "Master orchestrator that classifies customer intent and delegates to specialized sub-agents. Never answers questions directly.",
    capabilities: ["Intent Classification", "Delegation"],
    tools: ["delegateToSubAgent"],
    systemPrompt: "You are the master Router Agent...",
  },
  {
    type: "ORDER",
    name: "Order Support Agent",
    description: "Handles inquiries about order status, shipping delays, and cancellations.",
    capabilities: ["Track Orders", "Check Shipping"],
    tools: ["getOrderStatus"],
    systemPrompt: "You are the Order Support Agent...",
  },
  {
    type: "BILLING",
    name: "Billing & Accounts Agent",
    description: "Handles inquiries about invoices, payments, and account details.",
    capabilities: ["Check Invoices", "Payment History"],
    tools: ["getInvoiceDetails"],
    systemPrompt: "You are the Billing Support Agent...",
  },
  {
    type: "SUPPORT",
    name: "Technical Support Agent",
    description: "Handles general inquiries, policy questions, and technical support using the Knowledge Base.",
    capabilities: ["Knowledge Base Search", "Policy Answers"],
    tools: ["searchKnowledgeBase"],
    systemPrompt: "You are the Technical Support Agent...",
  },
  {
    type: "FALLBACK",
    name: "Fallback Agent",
    description: "Catches unexpected or completely unrelated queries.",
    capabilities: ["Polite Refusal"],
    tools: [],
    systemPrompt: "You are a Fallback Agent...",
  },
];

export class AgentService {
  /**
   * Get all registered agents
   */
  static getAllAgents(): AgentInfo[] {
    return AGENT_REGISTRY;
  }

  /**
   * Get a specific agent by type
   */
  static getAgentByType(type: AgentType | string): AgentInfo | undefined {
    return AGENT_REGISTRY.find((a) => a.type === type.toUpperCase());
  }
}
