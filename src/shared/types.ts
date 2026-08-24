// ---------------------------------------------------------------------------
// Shared TypeScript Types — Node AI Customer Support
// ---------------------------------------------------------------------------
// All types that were previously in a separate @node-ai-customer-support/shared monorepo package
// are now unified in this single file for simpler architecture.
// Both backend and frontend will import from here.
// ---------------------------------------------------------------------------

export type AgentType = "ROUTER" | "SUPPORT" | "ORDER" | "BILLING" | "GREETING" | "FALLBACK";

export interface AgentInfo {
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  tools: string[];
  systemPrompt: string;
}

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ToolCallRecord {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
  timestamp: string;
}

export interface ReasoningStep {
  id: string;
  stage: "analyzing" | "routing" | "tool_execution" | "generating" | "completed";
  agent: AgentType;
  thought: string;
  timestamp: string;
  toolCall?: ToolCallRecord;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  agentType?: AgentType;
  reasoningSteps?: ReasoningStep[];
  toolCalls?: ToolCallRecord[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  _count?: {
    messages: number;
  };
}

export interface SendMessageRequest {
  conversationId?: string;
  userId?: string;
  content: string;
  preferredAgent?: AgentType;
}

export interface SendMessageResponse {
  conversationId: string;
  message: ChatMessage;
  agentType: AgentType;
  reasoningSteps: ReasoningStep[];
  toolCalls: ToolCallRecord[];
}

export interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  uptime: number;
  timestamp: string;
  database: "connected" | "disconnected";
  agentsAvailable: AgentType[];
}

// ---------------------------------------------------------------------------
// NEW INTELLIGENCE FIXES (Phase 7)
// ---------------------------------------------------------------------------

// Fix #4: Conversation State (follow-up context tracking)
export interface ConversationState {
  lastMentionedOrderId: string | null;
  lastMentionedInvoiceId: string | null;
  lastAgent: AgentType | null;
  recentTopic: string | null;
}

// Fix #2: Single Classifier (intent classification result)
export interface ClassificationResult {
  agentType: AgentType;
  confidence: number;
  rationale: string;
  scores: Record<AgentType, number>;
}
