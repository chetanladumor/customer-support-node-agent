export type AgentType = "ROUTER" | "ORDER" | "BILLING" | "SUPPORT" | "FALLBACK";

export interface AgentInfo {
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
}

export interface ReasoningStep {
  id: string;
  stage: "analyzing" | "routing" | "generating" | "completed";
  agent: AgentType;
  thought: string;
  timestamp: string;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  args: any;
  timestamp: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentType?: AgentType;
  reasoningSteps?: ReasoningStep[];
  toolCalls?: ToolCallRecord[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}
