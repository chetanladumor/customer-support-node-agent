import React from "react";
import type { AgentType } from "../shared/types";
import { Bot, Headphones, PackageCheck, CreditCard, Sparkles } from "lucide-react";

interface AgentBadgeProps {
  type?: AgentType;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({ type = "ROUTER", showIcon = true, size = "md" }) => {
  const getBadgeConfig = () => {
    switch (type) {
      case "ORDER":
        return {
          label: "Order Agent",
          icon: PackageCheck,
          classes: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "BILLING":
        return {
          label: "Billing Agent",
          icon: CreditCard,
          classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "SUPPORT":
        return {
          label: "Support Agent",
          icon: Headphones,
          classes: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        };
      case "FALLBACK":
        return {
          label: "General Agent",
          icon: Sparkles,
          classes: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        };
      case "ROUTER":
      default:
        return {
          label: "Router Agent",
          icon: Bot,
          classes: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5 font-medium",
    lg: "px-3 py-1.5 text-sm gap-2 font-semibold",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-sm ${config.classes} ${sizeClasses}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{config.label}</span>
    </span>
  );
};
