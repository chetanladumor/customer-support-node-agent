import React from "react";
import type { AgentInfo } from "../shared/types";
import { X, Bot, ShieldCheck, Wrench, CheckCircle } from "lucide-react";
import { AgentBadge } from "./AgentBadge";

interface AgentCapabilitiesModalProps {
  agents: AgentInfo[];
  isOpen: boolean;
  onClose: () => void;
}

export const AgentCapabilitiesModal: React.FC<AgentCapabilitiesModalProps> = ({
  agents,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Multi-Agent System Directory</h2>
              <p className="text-xs text-slate-400">Inspecting registered sub-agents, tools & system capabilities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.type}
              className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AgentBadge type={agent.type} size="md" />
                  <span className="font-bold text-slate-200 text-sm">{agent.name}</span>
                </div>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" /> Ready & Online
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{agent.description}</p>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Core Capabilities
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-slate-300">
                  {agent.capabilities.map((cap, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {agent.tools && agent.tools.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-amber-400" /> Database & System Tools
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.tools.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-900 border border-slate-800 text-indigo-300"
                      >
                        {t}()
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
