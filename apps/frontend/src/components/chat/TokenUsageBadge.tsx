"use client";

import { useEffect, useState } from "react";
import { api, type ConversationUsageSummary } from "@/lib/api";
import { Coins, Cpu, Zap } from "lucide-react";

interface TokenUsageBadgeProps {
  conversationId: string | null;
  /** Force refresh on new messages */
  refreshKey?: number;
}

export function TokenUsageBadge({ conversationId, refreshKey }: TokenUsageBadgeProps) {
  const [usage, setUsage] = useState<ConversationUsageSummary | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    api.getConversationUsage(conversationId)
      .then((r) => setUsage(r.data))
      .catch(() => setUsage(null));
  }, [conversationId, refreshKey]);

  if (!usage || usage.totalTokens === 0) return null;

  const costStr = usage.totalCost < 0.01
    ? `<$0.01`
    : `$${usage.totalCost.toFixed(4)}`;

  return (
    <div
      className="animate-fade-in-up"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 14px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        fontSize: 11,
        color: "#777",
        flexWrap: "wrap",
      }}
    >
      {/* Tokens */}
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Zap size={11} style={{ color: "#F59E0B", opacity: 0.7 }} />
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, color: "#A0A0A0" }}>
          {formatTokens(usage.totalTokens)}
        </span>
        <span style={{ opacity: 0.5 }}>tokens</span>
      </span>

      <span style={{ color: "#333" }}>·</span>

      {/* Cost */}
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Coins size={11} style={{ color: "#34D399", opacity: 0.7 }} />
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, color: "#A0A0A0" }}>
          {costStr}
        </span>
      </span>

      {/* Model */}
      {usage.lastModel && (
        <>
          <span style={{ color: "#333" }}>·</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Cpu size={11} style={{ color: "#60A5FA", opacity: 0.7 }} />
            <span style={{ fontWeight: 500, color: "#888" }}>
              {usage.lastModel}
            </span>
          </span>
        </>
      )}

      {/* Request count */}
      {usage.requestCount > 1 && (
        <>
          <span style={{ color: "#333" }}>·</span>
          <span style={{ opacity: 0.6 }}>
            {usage.requestCount} requests
          </span>
        </>
      )}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
