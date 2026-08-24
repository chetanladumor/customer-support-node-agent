import React, { useState, useRef, useEffect } from "react";
import type { ChatMessage, AgentType } from "../shared/types";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { AgentBadge } from "./AgentBadge";
import { ReasoningTimeline } from "./ReasoningTimeline";
import { ToolCallCard } from "./ToolCallCard";
import { SamplePrompts } from "./SamplePrompts";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UserProfile } from "../api/client";

interface ChatAreaProps {
  initialMessages: ChatMessage[];
  activeConversationId: string | null;
  currentUser: UserProfile | null;
  onConversationCreated: (id: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  initialMessages,
  activeConversationId,
  currentUser,
  onConversationCreated,
}) => {
  const [preferredAgent, setPreferredAgent] = useState<AgentType | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mappedInitialMessages = initialMessages.map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
    toolInvocations: msg.toolCalls?.map(tc => ({
      toolCallId: tc.id,
      toolName: tc.name,
      args: tc.args,
      state: 'result' as const,
      result: 'Success',
    })) || [],
    // Attach original DB fields to metadata so we can still render them if needed
    data: {
      agentType: msg.agentType,
      reasoningSteps: msg.reasoningSteps,
    }
  }));

  const [input, setInput] = useState("");
  
  const newConvIdRef = useRef<string | null>(null);

  const chatContext = useChat({
    id: activeConversationId || "new",
    messages: mappedInitialMessages as any,
    transport: new DefaultChatTransport({
      api: "/api/chat/messages",
      headers: {
        "X-User-Id": currentUser?.id || "",
        "Authorization": `Bearer ${currentUser?.id}`,
      },
      body: {
        conversationId: activeConversationId || undefined,
        preferredAgent,
      },
      fetch: async (url, options) => {
        const headers = new Headers(options?.headers);
        headers.set("X-User-Id", currentUser?.id || "");
        headers.set("Authorization", `Bearer ${currentUser?.id}`);
        
        console.log("[ChatArea] Sending message with user ID:", currentUser?.id, "to URL:", url);
        
        const response = await fetch("/api/chat/messages", {
          ...options,
          headers: headers,
        });

        const serverConvId = response.headers.get("x-conversation-id");
        if (serverConvId) {
          newConvIdRef.current = serverConvId;
        }

        return response;
      },
    }),
    onFinish: (_message) => {
      if (!activeConversationId && newConvIdRef.current) {
        onConversationCreated(newConvIdRef.current);
        newConvIdRef.current = null;
      }
    }
  });

  const { messages, status, error, append, sendMessage, setMessages } = chatContext as any;
  const isLoading = status === 'submitted' || status === 'streaming';

  // Sync initialMessages with useChat's state when they change (e.g. after async load)
  useEffect(() => {
    if (setMessages && mappedInitialMessages.length > 0) {
      // Only sync if useChat's messages are empty, or if we are explicitly loading a new history
      if (messages.length === 0 || mappedInitialMessages.length > messages.length) {
        setMessages(mappedInitialMessages);
      }
    }
  }, [initialMessages]); // depend on the raw prop to avoid infinite loops from mapping

  const handleSend = (text: string) => {
    if (!text?.trim() || isLoading) return;
    
    if (append) {
      append({ role: 'user', content: text });
    } else if (sendMessage) {
      sendMessage({ role: 'user', content: text });
    }
    
    setInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-xl shadow-indigo-500/10">
              <Bot className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">
              AI Multi-Agent Support System
            </h2>
            <p className="text-xs text-slate-400 max-w-md mb-8 leading-relaxed">
              Our Router Agent classifies your inquiry and coordinates with specialized Support, Order, and Billing sub-agents with live database tool execution.
            </p>
            <SamplePrompts onSelectPrompt={(prompt) => handleSend(prompt)} />
          </div>
        ) : (
          messages.map((msg) => {
            console.log("[ChatArea] rendering message:", msg);
            const isUser = msg.role === "user";
            // Check if it has our custom data (from initialMessages DB records)
            const agentType = (msg as any).data?.agentType || (msg as any).agentType || "ROUTER";
            const reasoningSteps = (msg as any).data?.reasoningSteps || [];

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    isUser
                      ? "bg-slate-700 text-slate-200"
                      : "bg-gradient-to-tr from-indigo-600 to-violet-500 text-white"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble Container */}
                <div className={`space-y-1.5 max-w-full ${isUser ? "items-end" : "items-start"}`}>
                  {/* Agent Header for Assistant */}
                  {!isUser && (
                    <div className="flex items-center gap-2 mb-1">
                      <AgentBadge type={agentType} size="sm" />
                      <span className="text-[10px] text-slate-500 font-mono">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  )}

                  {/* Multi-Agent Reasoning Chain (Synthesized from Tools) */}
                  {(() => {
                    const uniqueTools = new Map();
                    
                    // Collect tools from legacy toolInvocations
                    if (msg.toolInvocations) {
                      msg.toolInvocations.forEach((tc: any) => {
                        if (tc.toolCallId) {
                          uniqueTools.set(tc.toolCallId, {
                            toolCallId: tc.toolCallId,
                            toolName: tc.toolName,
                            args: tc.args || tc.input || {},
                            result: tc.state === 'result' ? tc.result : ("result" in tc ? tc.result : ("output" in tc ? tc.output : undefined)),
                            isExecuting: tc.state !== 'result' && !("result" in tc) && !("output" in tc)
                          });
                        }
                      });
                    }
                    
                    // Collect tools from parts array
                    if ((msg as any).parts) {
                      (msg as any).parts.forEach((part: any) => {
                        const name = part.toolName || (part.type?.startsWith('tool-') ? part.type.replace('tool-', '') : null);
                        if (name && part.toolCallId) {
                          uniqueTools.set(part.toolCallId, {
                            toolCallId: part.toolCallId,
                            toolName: name,
                            args: part.args || part.input || {},
                            result: part.state === 'result' ? part.result : ("result" in part ? part.result : ("output" in part ? part.output : undefined)),
                            isExecuting: part.state !== 'result' && !("result" in part) && !("output" in part)
                          });
                        } else if (part.type === 'tool-invocation' && part.toolInvocation) {
                          uniqueTools.set(part.toolInvocation.toolCallId, {
                            toolCallId: part.toolInvocation.toolCallId,
                            toolName: part.toolInvocation.toolName,
                            args: part.toolInvocation.args || part.toolInvocation.input || {},
                            result: part.toolInvocation.state === 'result' ? part.toolInvocation.result : ("result" in part.toolInvocation ? part.toolInvocation.result : ("output" in part.toolInvocation ? part.toolInvocation.output : undefined)),
                            isExecuting: part.toolInvocation.state !== 'result' && !("result" in part.toolInvocation) && !("output" in part.toolInvocation)
                          });
                        }
                      });
                    }

                    const originalSteps = msg.reasoningSteps || (msg as any).data?.reasoningSteps || [];
                    const toolSteps = Array.from(uniqueTools.values()).map((tc: any) => ({
                      id: tc.toolCallId,
                      agent: (msg as any).agentType || (msg as any).data?.agentType || "ROUTER",
                      stage: tc.isExecuting ? "executing_tool" : "tool_execution_complete",
                      thought: tc.isExecuting 
                        ? `Executing database query via tool: ${tc.toolName}...` 
                        : `Successfully executed tool: ${tc.toolName} and retrieved database records.`,
                      timestamp: (msg.createdAt || new Date()).toISOString(),
                      toolCall: {
                        id: tc.toolCallId,
                        name: tc.toolName,
                        args: tc.args,
                        result: tc.result,
                        timestamp: (msg.createdAt || new Date()).toISOString(),
                      }
                    }));

                    const synthesizedSteps = [...originalSteps, ...toolSteps];

                    if (!isUser && synthesizedSteps.length > 0) {
                      return <ReasoningTimeline steps={synthesizedSteps} />;
                    }
                    return null;
                  })()}

                  {/* Content Bubble */}
                  {(msg.content || (msg as any).parts?.some((p: any) => p.type === 'text')) && (
                    <div
                      className={`px-4 py-3 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                        isUser
                          ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                          : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none prose prose-invert max-w-none"
                      }`}
                    >
                      {msg.content}
                      {(msg as any).parts?.map((part: any, i: number) => {
                        if (part.type === 'text') return <span key={i}>{part.text}</span>;
                        return null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Real-time Thinking & Execution Indicator for router analysis */}
        {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
          <div className="flex gap-3 max-w-3xl mr-auto animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-900/90 border border-indigo-900/50 shadow-xl space-y-2 max-w-md">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-semibold text-indigo-300">
                  Routing & Querying Multi-Agent System...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Indicator */}
        {error && (
          <div className="flex gap-3 max-w-3xl mr-auto animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-xl bg-red-900/50 border border-red-800/50 flex items-center justify-center text-red-400 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl rounded-tl-none bg-red-950/40 border border-red-900/50 shadow-sm max-w-md">
              <div className="text-xs font-semibold text-red-400 mb-1">Stream Error</div>
              <div className="text-xs text-red-300/80 break-words font-mono">
                {error.message || "An unknown error occurred during generation."}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Area */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-800 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-2">
          {/* Agent override selector pills */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Routing:</span>
              <button
                type="button"
                onClick={() => setPreferredAgent(undefined)}
                className={`px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                  preferredAgent === undefined
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                Auto (Router Agent)
              </button>
              {(["ORDER", "BILLING", "SUPPORT"] as AgentType[]).map((agent) => (
                <button
                  key={agent}
                  type="button"
                  onClick={() => setPreferredAgent(agent)}
                  className={`px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                    preferredAgent === agent
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                  }`}
                >
                  Force {agent}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about orders, tracking, refunds, invoices, or support policies..."
              disabled={isLoading}
              className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!input?.trim() || isLoading}
              className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};
