"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import type { ExecutionRecord } from "@/components/execution/execution-types";
import {
  fromAgentThinking,
  fromPolicyChecking,
  fromToolStarted,
  fromToolCompleted,
  fromToolFailed,
  fromToolBlocked,
  fromApprovalPending,
  fromApprovalResolved,
  fromScrapePhase,
} from "@/lib/execution-humanize";

/**
 * Streams humanized execution rows for a conversation while `enabled`.
 * Orphan scrape events (no conversationId) attach when `acceptOrphanScrape` is true.
 */
export function useChatExecutionSocket(
  conversationId: string | null,
  enabled: boolean,
  acceptOrphanScrape: boolean,
  onAppend: (row: ExecutionRecord) => void,
): void {
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;

  const lastThinkingRef = useRef(0);

  useEffect(() => {
    if (!enabled || !conversationId) return;

    const sock = getSocket();
    const push = (row: ExecutionRecord) => {
      onAppendRef.current(row);
    };

    const match = (cid?: string) => cid === conversationId;

    const onThinking = (d: { conversationId: string; iteration?: number }) => {
      if (!match(d.conversationId)) return;
      const now = Date.now();
      if (now - lastThinkingRef.current < 350) return;
      lastThinkingRef.current = now;
      push(fromAgentThinking(d));
    };

    const onPolicy = (d: { conversationId: string; toolName: string }) => {
      if (!match(d.conversationId)) return;
      push(fromPolicyChecking(d));
    };

    const onToolStart = (d: {
      conversationId?: string;
      toolName: string;
      serverName: string;
    }) => {
      if (!match(d.conversationId)) return;
      push(fromToolStarted(d));
    };

    const onToolDone = (d: {
      conversationId?: string;
      toolName: string;
      success: boolean;
    }) => {
      if (!match(d.conversationId)) return;
      push(fromToolCompleted(d));
    };

    const onToolFail = (d: {
      conversationId?: string;
      toolName: string;
      error: string;
    }) => {
      if (!match(d.conversationId)) return;
      push(fromToolFailed(d));
    };

    const onBlocked = (d: { conversationId: string; toolName: string; reason: string }) => {
      if (!match(d.conversationId)) return;
      push(fromToolBlocked(d));
    };

    const onApPending = (d: { conversationId: string; toolName: string }) => {
      if (!match(d.conversationId)) return;
      push(fromApprovalPending(d));
    };

    const onApResolved = (d: {
      conversationId: string;
      toolName: string;
      status: string;
      result?: string;
    }) => {
      if (!match(d.conversationId)) return;
      push(fromApprovalResolved(d));
    };

    const onScrape = (d: { message: string; website?: string }) => {
      if (!acceptOrphanScrape) return;
      push(fromScrapePhase(d));
    };

    sock.on("agent:thinking", onThinking);
    sock.on("policy:checking", onPolicy);
    sock.on("tool:started", onToolStart);
    sock.on("tool:completed", onToolDone);
    sock.on("tool:failed", onToolFail);
    sock.on("tool:blocked", onBlocked);
    sock.on("approval:pending", onApPending);
    sock.on("approval:resolved", onApResolved);
    sock.on("scrape:phase", onScrape);

    return () => {
      sock.off("agent:thinking", onThinking);
      sock.off("policy:checking", onPolicy);
      sock.off("tool:started", onToolStart);
      sock.off("tool:completed", onToolDone);
      sock.off("tool:failed", onToolFail);
      sock.off("tool:blocked", onBlocked);
      sock.off("approval:pending", onApPending);
      sock.off("approval:resolved", onApResolved);
      sock.off("scrape:phase", onScrape);
    };
  }, [conversationId, enabled, acceptOrphanScrape]);
}
