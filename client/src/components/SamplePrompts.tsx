import React from "react";
import { Package, CreditCard, HelpCircle, XCircle, ListOrdered, UserCheck } from "lucide-react";

interface SamplePromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

export const SamplePrompts: React.FC<SamplePromptsProps> = ({ onSelectPrompt }) => {
  const samples = [
    {
      icon: ListOrdered,
      label: "List My Orders",
      prompt: "What are my active orders?",
      badge: "Order Agent (User Ledger)",
      badgeClass: "text-amber-400 bg-amber-950/60 border-amber-800/40",
    },
    {
      icon: Package,
      label: "Track Specific Order",
      prompt: "Where is my order ORDER-1002 and was it delivered?",
      badge: "Order Agent (ORDER-1002)",
      badgeClass: "text-amber-400 bg-amber-950/60 border-amber-800/40",
    },
    {
      icon: CreditCard,
      label: "My Invoices & Ledger",
      prompt: "What are my invoices and payment records?",
      badge: "Billing Agent (User Invoices)",
      badgeClass: "text-emerald-400 bg-emerald-950/60 border-emerald-800/40",
    },
    {
      icon: CreditCard,
      label: "Refund Status",
      prompt: "Can you check the refund status for invoice INV-2024-002?",
      badge: "Billing Agent (Refund Audit)",
      badgeClass: "text-emerald-400 bg-emerald-950/60 border-emerald-800/40",
    },
    {
      icon: HelpCircle,
      label: "Return Policy FAQ",
      prompt: "What is your return policy for electronics and how many days do I have?",
      badge: "Support Agent (Knowledge Base)",
      badgeClass: "text-sky-400 bg-sky-950/60 border-sky-800/40",
    },
    {
      icon: UserCheck,
      label: "Customer Profile",
      prompt: "Who am I and what is my registered delivery address?",
      badge: "Support Agent (User Profile)",
      badgeClass: "text-purple-400 bg-purple-950/60 border-purple-800/40",
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="text-xs font-semibold text-slate-400 mb-2.5 px-1 uppercase tracking-wider">
        Interactive Test Prompts (Live Database & User Context)
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {samples.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="flex flex-col text-left p-3 rounded-xl border border-slate-800/90 bg-slate-900/60 hover:bg-slate-800/80 hover:border-indigo-500/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-medium text-slate-200 text-xs group-hover:text-indigo-300">
                  <Icon className="w-3.5 h-3.5 text-indigo-400" />
                  {item.label}
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${item.badgeClass}`}>
                  {item.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                "{item.prompt}"
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
