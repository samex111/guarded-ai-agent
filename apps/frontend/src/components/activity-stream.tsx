"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { fromScrapePhase } from "@/lib/execution-humanize";

export interface ActivityItem {
  id: string;
  at: number;
  text: string;
}

function matchesConversationFilter(
  filter: string | null | undefined,
  payloadConv?: string,
): boolean {
  if (!filter) return true;
  if (!payloadConv) return false;
  return payloadConv === filter;
}

/**
 * Live execution timeline (tools, policy, scrape phases). Scoped to a conversation when `conversationId` is set.
 *
 * `mode`: `full` = agent + tools + approvals; `ingestion` = scrape phases only (e.g. Leads dashboard).
 */
export function ActivityStream({
  conversationId,
  maxItems = 60,
  mode = "full",
}: {
  conversationId?: string | null;
  maxItems?: number;
  mode?: "full" | "ingestion";
}) {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const sock = getSocket();

    const push = (text: string, payloadConv?: string) => {
      if (!matchesConversationFilter(conversationId ?? null, payloadConv)) return;
      setItems((prev) => {
        const next: ActivityItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          at: Date.now(),
          text,
        };
        return [...prev, next].slice(-maxItems);
      });
    };

    const onThinking = (d: { conversationId: string; iteration?: number }) => {
      push(`🧠 Thinking… (step ${d.iteration ?? "?"})`, d.conversationId);
    };
    const onPolicy = (d: { conversationId: string; toolName: string }) => {
      push(`🛡 Checking policy for ${d.toolName}…`, d.conversationId);
    };
    const onToolStart = (d: {
      conversationId?: string;
      toolName: string;
      serverName: string;
    }) => {
      push(`⚡ ${d.toolName} — ${d.serverName}`, d.conversationId);
    };
    const onToolDone = (d: {
      conversationId?: string;
      toolName: string;
      success: boolean;
      latencyMs: number;
    }) => {
      const icon = d.success ? "✅" : "❌";
      push(`${icon} ${d.toolName} completed (${d.latencyMs}ms)`, d.conversationId);
    };
    const onToolFail = (d: {
      conversationId?: string;
      toolName: string;
      error: string;
    }) => {
      push(`❌ ${d.toolName} failed: ${d.error.slice(0, 120)}`, d.conversationId);
    };
    const onBlocked = (d: { conversationId: string; toolName: string; reason: string }) => {
      push(`🚫 Blocked ${d.toolName}: ${d.reason.slice(0, 100)}`, d.conversationId);
    };
    const onApprovalPending = (d: {
      conversationId: string;
      toolName: string;
    }) => {
      push(`⏳ Approval required: ${d.toolName}`, d.conversationId);
    };
    const onApprovalApproved = (d: { conversationId: string; toolName: string }) => {
      push(`✅ Admin approved ${d.toolName}`, d.conversationId);
    };
    const onApprovalRejected = (d: { conversationId: string; toolName: string }) => {
      push(`❌ Admin rejected ${d.toolName}`, d.conversationId);
    };
    const onApprovalResolved = (d: {
      conversationId: string;
      toolName: string;
      status: string;
      result?: string;
    }) => {
      const tail = d.result ? ` — ${d.result.slice(0, 160)}${d.result.length > 160 ? "…" : ""}` : "";
      push(`📋 Approval ${d.status.toLowerCase()}: ${d.toolName}${tail}`, d.conversationId);
    };
    const onScrape = (d: { message: string; website?: string }) => {
      const title = fromScrapePhase(d).title;
      if (conversationId) return;
      push(`🌐 ${title}`);
    };

    if (mode === "full") {
      sock.on("agent:thinking", onThinking);
      sock.on("policy:checking", onPolicy);
      sock.on("tool:started", onToolStart);
      sock.on("tool:completed", onToolDone);
      sock.on("tool:failed", onToolFail);
      sock.on("tool:blocked", onBlocked);
      sock.on("approval:pending", onApprovalPending);
      sock.on("approval:approved", onApprovalApproved);
      sock.on("approval:rejected", onApprovalRejected);
      sock.on("approval:resolved", onApprovalResolved);
    }
    sock.on("scrape:phase", onScrape);

    return () => {
      if (mode === "full") {
        sock.off("agent:thinking", onThinking);
        sock.off("policy:checking", onPolicy);
        sock.off("tool:started", onToolStart);
        sock.off("tool:completed", onToolDone);
        sock.off("tool:failed", onToolFail);
        sock.off("tool:blocked", onBlocked);
        sock.off("approval:pending", onApprovalPending);
        sock.off("approval:approved", onApprovalApproved);
        sock.off("approval:rejected", onApprovalRejected);
        sock.off("approval:resolved", onApprovalResolved);
      }
      sock.off("scrape:phase", onScrape);
    };
  }, [conversationId, maxItems, mode]);

  if (items.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-3 text-xs space-y-1.5 max-h-64 overflow-y-auto"
      style={{
        background: "rgba(22, 22, 23, 0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="font-semibold text-[10px] uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>
        Live activity
      </div>
      {items.map((a) => (
        <div key={a.id} className="leading-snug" style={{ color: "#CBD5E1" }}>
          {a.text}
        </div>
      ))}
    </div>
  );
}
