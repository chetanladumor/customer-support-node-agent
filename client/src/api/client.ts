import type {
  Conversation,
  AgentInfo,
  SendMessageRequest,
  SendMessageResponse,
  HealthCheckResponse,
} from "../shared/types";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  address: string | null;
  _count?: { orders: number; invoices: number; conversations: number };
}

export const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api` 
  : "/api";
let fallbackUserId = "user_chetan_1";

export function setCurrentUser(userId: string) {
  console.log("[apiClient] Switching user to:", userId);
  fallbackUserId = userId;
  localStorage.setItem("currentUser", userId);
}

export function getCurrentUser() {
  return localStorage.getItem("currentUser") || fallbackUserId;
}

function getHeaders() {
  const userId = getCurrentUser();
  console.log("[apiClient] Preparing headers for user:", userId);
  return {
    "Content-Type": "application/json",
    "X-User-Id": userId,
    "Authorization": `Bearer ${userId}`,
  };
}

export const apiClient = {
  async getHealth(): Promise<HealthCheckResponse> {
    const res = await fetch(`${API_BASE}/health`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Health check failed");
    return res.json();
  },

  async listUsers(): Promise<UserProfile[]> {
    const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
    const data = await res.json();
    return data.data;
  },

  async listAgents(): Promise<AgentInfo[]> {
    const res = await fetch(`${API_BASE}/agents`, { headers: getHeaders() });
    const data = await res.json();
    return data.data;
  },

  async getAgentCapabilities(type: string): Promise<AgentInfo> {
    const res = await fetch(`${API_BASE}/agents/${type}/capabilities`, { headers: getHeaders() });
    const data = await res.json();
    return data.data;
  },

  async listConversations(userId = getCurrentUser()): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/chat/conversations?userId=${userId}`, { headers: getHeaders() });
    const data = await res.json();
    return data.data;
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/chat/conversations/${id}`, { headers: getHeaders() });
    const data = await res.json();
    return data.data;
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/conversations/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete conversation");
  },

  async sendMessage(payload: SendMessageRequest): Promise<SendMessageResponse> {
    const res = await fetch(`${API_BASE}/chat/messages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ ...payload, userId: getCurrentUser() }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || "Failed to process message");
    }
    return data.data;
  },
};
