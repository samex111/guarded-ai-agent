"use client";

import { useEffect, useRef, useState } from "react";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  useEffect(() => {
    const sock = getSocket();

    const push = (text: string, payloadConv?: string) => {
      if (!matchesConversationFilter(conversationId ?? null, payloadConv)) return;
      setItems((prev) => {
        const next: ActivityItem = {
          id:   `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          at:   Date.now(),
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
    const onToolStart = (d: { conversationId?: string; toolName: string; serverName: string }) => {
      push(`⚡ ${d.toolName} — ${d.serverName}`, d.conversationId);
    };
    const onToolDone = (d: { conversationId?: string; toolName: string; success: boolean; latencyMs: number }) => {
      const icon = d.success ? "✅" : "❌";
      push(`${icon} ${d.toolName} completed (${d.latencyMs}ms)`, d.conversationId);
    };
    const onToolFail = (d: { conversationId?: string; toolName: string; error: string }) => {
      push(`❌ ${d.toolName} failed: ${d.error.slice(0, 120)}`, d.conversationId);
    };
    const onBlocked = (d: { conversationId: string; toolName: string; reason: string }) => {
      push(`🚫 Blocked ${d.toolName}: ${d.reason.slice(0, 100)}`, d.conversationId);
    };
    const onApprovalPending = (d: { conversationId: string; toolName: string }) => {
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
      sock.on("agent:thinking",    onThinking);
      sock.on("policy:checking",   onPolicy);
      sock.on("tool:started",      onToolStart);
      sock.on("tool:completed",    onToolDone);
      sock.on("tool:failed",       onToolFail);
      sock.on("tool:blocked",      onBlocked);
      sock.on("approval:pending",  onApprovalPending);
      sock.on("approval:approved", onApprovalApproved);
      sock.on("approval:rejected", onApprovalRejected);
      sock.on("approval:resolved", onApprovalResolved);
    }
    sock.on("scrape:phase", onScrape);

    return () => {
      if (mode === "full") {
        sock.off("agent:thinking",    onThinking);
        sock.off("policy:checking",   onPolicy);
        sock.off("tool:started",      onToolStart);
        sock.off("tool:completed",    onToolDone);
        sock.off("tool:failed",       onToolFail);
        sock.off("tool:blocked",      onBlocked);
        sock.off("approval:pending",  onApprovalPending);
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
      style={{
        borderRadius:    "var(--radius-lg)",
        padding:         "12px 14px",
        maxHeight:       240,
        overflowY:       "auto",
        background:      "rgba(18,19,21,0.85)",
        border:          "1px solid var(--border-secondary)",
        backdropFilter:  "blur(12px)",
        display:         "flex",
        flexDirection:   "column",
        gap:             4,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize:       "10px",
          fontWeight:     "var(--font-semibold)",
          textTransform:  "uppercase",
          letterSpacing:  "0.10em",
          color:          "var(--text-disabled)",
          marginBottom:   4,
        }}
      >
        Live activity
      </div>

      {/* Items */}
      {items.map((a) => (
        <div
          key={a.id}
          className="animate-fade-in"
          style={{
            fontSize:    "var(--text-xs)",
            lineHeight:  1.6,
            color:       "var(--text-muted)",
            fontFamily:  "var(--font-mono)",
          }}
        >
          {a.text}
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
