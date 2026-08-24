import React, { useState, useEffect } from "react";
import type { Conversation, ChatMessage, AgentInfo, AgentType } from "./shared/types";
import { apiClient, setCurrentUser, type UserProfile } from "./api/client";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { AgentCapabilitiesModal } from "./components/AgentCapabilitiesModal";

export const App: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingThought, setLoadingThought] = useState("");

  // Load initial data: users & agents
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const userList = await apiClient.listUsers();
      setUsers(userList);
      if (userList.length > 0) {
        const savedUserId = localStorage.getItem("currentUser");
        const initial = userList.find(u => u.id === savedUserId) || userList[0];
        setCurrentUserState(initial);
        setCurrentUser(initial.id);
        await loadConversationsForUser(initial.id);
      }
      loadAgents();
    } catch (e) {
      console.error("Failed to load initial data:", e);
    }
  };

  const loadConversationsForUser = async (userId: string) => {
    try {
      const list = await apiClient.listConversations(userId);
      setConversations(list);
      if (list.length > 0) {
        const savedConvId = localStorage.getItem("activeConversationId");
        const convToSelect = list.find(c => c.id === savedConvId) || list[0];
        await selectConversation(convToSelect.id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    const selected = users.find((u) => u.id === userId);
    if (selected) {
      localStorage.setItem("currentUser", userId);
      localStorage.removeItem("activeConversationId");
      // 1. Immediately reset active chat state to avoid showing previous user chat
      setActiveConversationId(null);
      setMessages([]);
      setConversations([]);
      setCurrentUserState(selected);
      setCurrentUser(selected.id);

      // 2. Load conversations strictly for the new user
      await loadConversationsForUser(selected.id);
    }
  };

  const loadAgents = async () => {
    try {
      const list = await apiClient.listAgents();
      setAgents(list);
    } catch (e) {
      console.error("Failed to load agents:", e);
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    localStorage.setItem("activeConversationId", id);
    try {
      const conv = await apiClient.getConversation(id);
      setMessages(conv.messages || []);
    } catch (e) {
      console.error("Failed to load conversation messages:", e);
      setMessages([]);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    localStorage.removeItem("activeConversationId");
    setMessages([]);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await apiClient.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onOpenAgentModal={() => setIsAgentModalOpen(true)}
        agentsCount={agents.length}
        users={users}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
      />

      {currentUser ? (
        <ChatArea
          key={`${currentUser.id}-${activeConversationId || 'new'}`}
          activeConversationId={activeConversationId}
          initialMessages={messages}
          currentUser={currentUser}
          onConversationCreated={async (newId) => {
            await selectConversation(newId);
            if (currentUser) {
              apiClient.listConversations(currentUser.id).then(setConversations);
            }
          }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      <AgentCapabilitiesModal
        agents={agents}
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
      />
    </div>
  );
};
