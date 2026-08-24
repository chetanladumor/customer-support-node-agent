import React, { useState } from "react";
import type { ToolCallRecord } from "../shared/types";
import { Terminal, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

interface ToolCallCardProps {
  name: string;
  args: Record<string, any>;
  result?: any;
  isExecuting?: boolean;
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ name, args, result, isExecuting }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-slate-800 bg-slate-900/80 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 hover:bg-slate-800/80 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400 font-mono">Tool Executed:</span>
          <span className="font-semibold text-slate-200 font-mono">{name}</span>
          {isExecuting ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded-full">
              Executing...
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded-full">
              <CheckCircle2 className="w-2.5 h-2.5" /> DB Query OK
            </span>
          )}
        </div>
        <div className="text-slate-500 hover:text-slate-300">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-950/60 font-mono">
          <div>
            <div className="text-slate-500 mb-1 text-[10px] uppercase font-bold tracking-wider">Input Arguments</div>
            <pre className="p-2 rounded bg-slate-900 text-slate-300 overflow-x-auto text-[11px]">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          {result && (
            <div>
              <div className="text-slate-500 mb-1 text-[10px] uppercase font-bold tracking-wider">Database Result</div>
              <pre className="p-2 rounded bg-slate-900 text-emerald-300/90 overflow-x-auto text-[11px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
