import React from "react";
import type { Conversation } from "../shared/types";
import type { UserProfile } from "../api/client";
import {
  MessageSquarePlus,
  MessagesSquare,
  Bot,
  Trash2,
  Activity,
  User,
  Users,
  ChevronDown,
} from "lucide-react";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenAgentModal: () => void;
  agentsCount: number;
  users: UserProfile[];
  currentUser: UserProfile | null;
  onSwitchUser: (userId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onOpenAgentModal,
  agentsCount,
  users,
  currentUser,
  onSwitchUser,
}) => {
  return (
    <aside className="w-72 border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-xl flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 leading-tight">Swadesh AI</h1>
            <span className="text-[10px] text-indigo-400 font-medium">Multi-Agent Support</span>
          </div>
        </div>
      </div>

      {/* Customer Account Switcher */}
      <div className="p-3 border-b border-slate-800/60 bg-slate-950/30">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 mb-1 px-1">
          <span>Active Customer</span>
          <span className="text-emerald-400">● Live DB</span>
        </div>
        <select
          value={currentUser?.id || ""}
          onChange={(e) => {
            if (e.target.value) onSwitchUser(e.target.value);
          }}
          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
        >
          {users.length === 0 && <option value="">Loading users...</option>}
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email.split("@")[0]})
            </option>
          ))}
        </select>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/35 transition-all"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Support Session</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Sessions ({conversations.length})
        </div>
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 px-4">
            No past conversations for this user. Click "New Support Session" to begin.
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  isActive
                    ? "bg-slate-800 text-slate-100 font-medium border border-slate-700 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <MessagesSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                  <span className="truncate">{conv.title || "Support Thread"}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-all"
                  title="Delete Session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Agent Capabilities trigger & Active User Badge */}
      <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-950/40">
        <button
          onClick={onOpenAgentModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Agent Directory</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-indigo-300 font-mono">
            {agentsCount} Active
          </span>
        </button>

        {/* User Card */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="overflow-hidden flex-1">
            <div className="text-xs font-semibold text-slate-200 truncate">{currentUser?.name || "Customer"}</div>
            <div className="text-[10px] text-slate-500 truncate">{currentUser?.email || "customer@example.com"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
