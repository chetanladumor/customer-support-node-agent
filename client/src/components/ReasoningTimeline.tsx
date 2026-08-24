import React, { useState } from "react";
import type { ReasoningStep } from "../shared/types";
import { Sparkles, ChevronDown, ChevronUp, Cpu, Workflow } from "lucide-react";
import { AgentBadge } from "./AgentBadge";
import { ToolCallCard } from "./ToolCallCard";

interface ReasoningTimelineProps {
  steps: ReasoningStep[];
}

export const ReasoningTimeline: React.FC<ReasoningTimelineProps> = ({ steps }) => {
  const [expanded, setExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-indigo-950 bg-indigo-950/20 backdrop-blur-md overflow-hidden text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-indigo-950/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="font-semibold text-indigo-300">Multi-Agent Reasoning Chain</span>
          <span className="text-[11px] text-slate-400 bg-indigo-900/40 px-2 py-0.5 rounded-full border border-indigo-800/40">
            {steps.length} steps executed
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-indigo-400 font-medium text-[11px]">
          <span>{expanded ? "Hide Thought Process" : "View Thought Process"}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="p-3.5 border-t border-indigo-900/30 space-y-3 bg-slate-950/50">
          {steps.map((step, idx) => (
            <div key={step.id || idx} className="relative pl-5 border-l-2 border-indigo-500/30 space-y-1">
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-slate-950" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AgentBadge type={step.agent} size="sm" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    [{step.stage}]
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[12px] pt-0.5">{step.thought}</p>
              {step.toolCall && (
                <ToolCallCard
                  name={step.toolCall.name}
                  args={step.toolCall.args}
                  result={step.toolCall.result}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
