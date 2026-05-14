/**
 * Maps backend socket payloads to user-facing execution copy.
 * Avoids raw event names, latency dumps, and internal jargon.
 */

import type { ExecutionRecord, ExecutionKind } from "@/components/execution/execution-types";

function rid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Friendly MCP server label for chips */
export function serverDisplayLabel(serverName: string): string {
  const s = serverName.toLowerCase();
  if (s.includes("lead")) return "Lead Intelligence MCP";
  if (s.includes("filesystem") || s.includes("file")) return "Filesystem MCP";
  if (s.includes("context7")) return "Context7 MCP";
  if (s.length > 28) return `${serverName.slice(0, 26)}…`;
  return serverName;
}

function humanScrapeMessage(message: string, website?: string): string {
  const m = message.toLowerCase();
  if (m.includes("fetching")) return website ? `Fetching ${truncateUrl(website)}` : "Fetching website…";
  if (m.includes("extracting metadata")) return "Reading page content…";
  if (m.includes("detecting technologies")) return "Detecting technologies…";
  if (m.includes("calculating lead score")) return "Scoring lead…";
  if (m.includes("saving lead")) return "Saving lead…";
  if (m.includes("lead created")) return "Lead saved";
  return message.replace(/…/g, "…").trim() || "Working…";
}

function truncateUrl(url: string, max = 36): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
    return host.length > max ? `${host.slice(0, max)}…` : host;
  } catch {
    return url.length > max ? `${url.slice(0, max)}…` : url;
  }
}

export function fromAgentThinking(d: {
  conversationId: string;
  iteration?: number;
}): ExecutionRecord {
  return {
    id: rid(),
    kind: "thinking",
    title: "Thinking…",
    subtitle: undefined,
    status: "active",
  };
}

export function fromPolicyChecking(d: {
  conversationId: string;
  toolName: string;
}): ExecutionRecord {
  return {
    id: rid(),
    kind: "policy",
    title: "Checking permissions…",
    subtitle: `For “${d.toolName}”`,
    status: "active",
  };
}

export function fromToolStarted(d: {
  toolName: string;
  serverName: string;
  conversationId?: string;
}): ExecutionRecord {
  return {
    id: rid(),
    kind: "tool",
    title: `Using ${d.toolName}`,
    subtitle: serverDisplayLabel(d.serverName),
    status: "active",
    toolName: d.toolName,
    serverLabel: serverDisplayLabel(d.serverName),
  };
}

export function fromToolCompleted(d: {
  toolName: string;
  success: boolean;
  conversationId?: string;
}): ExecutionRecord {
  if (d.success) {
    return {
      id: rid(),
      kind: "success",
      title: "Step completed",
      subtitle: `${d.toolName} finished successfully`,
      status: "done",
      toolName: d.toolName,
    };
  }
  return {
    id: rid(),
    kind: "error",
    title: "Step did not complete",
    subtitle: d.toolName,
    status: "error",
    toolName: d.toolName,
  };
}

export function fromToolFailed(d: { toolName: string; error: string }): ExecutionRecord {
  const short = d.error.length > 90 ? `${d.error.slice(0, 90)}…` : d.error;
  return {
    id: rid(),
    kind: "error",
    title: "Something went wrong",
    subtitle: short,
    status: "error",
    toolName: d.toolName,
  };
}

export function fromToolBlocked(d: { toolName: string; reason: string }): ExecutionRecord {
  const short = d.reason.length > 72 ? `${d.reason.slice(0, 72)}…` : d.reason;
  return {
    id: rid(),
    kind: "error",
    title: "Action wasn’t allowed",
    subtitle: short,
    status: "error",
    toolName: d.toolName,
  };
}

export function fromApprovalPending(d: { toolName: string }): ExecutionRecord {
  return {
    id: rid(),
    kind: "approval",
    title: "Waiting for a teammate…",
    subtitle: `Approval needed for “${d.toolName}”`,
    status: "active",
    toolName: d.toolName,
  };
}

export function fromApprovalResolved(d: {
  toolName: string;
  status: string;
  result?: string;
}): ExecutionRecord {
  const st = d.status.toUpperCase();
  if (st === "APPROVED") {
    return {
      id: rid(),
      kind: "success",
      title: "Finished running the approved action",
      subtitle: d.result
        ? d.result.length > 100
          ? `${d.result.slice(0, 100)}…`
          : d.result
        : `${d.toolName} completed`,
      status: "done",
      toolName: d.toolName,
    };
  }
  if (st === "REJECTED" || st === "EXPIRED") {
    return {
      id: rid(),
      kind: "approval",
      title: st === "EXPIRED" ? "Approval timed out" : "Request closed",
      subtitle: d.toolName,
      status: "error",
      toolName: d.toolName,
    };
  }
  return {
    id: rid(),
    kind: "approval",
    title: "Request updated",
    subtitle: d.toolName,
    status: "done",
    toolName: d.toolName,
  };
}

export function fromScrapePhase(d: {
  message: string;
  website?: string;
}): ExecutionRecord {
  return {
    id: rid(),
    kind: "scrape",
    title: humanScrapeMessage(d.message, d.website),
    subtitle: d.website ? truncateUrl(d.website) : undefined,
    status: "active",
  };
}

/** Normalize kind for icon row */
export function kindIcon(kind: ExecutionKind): string {
  switch (kind) {
    case "thinking":
      return "🧠";
    case "policy":
      return "🛡";
    case "tool":
      return "⚡";
    case "scrape":
      return "🌐";
    case "success":
      return "✅";
    case "error":
      return "⚠️";
    case "approval":
      return "⏳";
    default:
      return "·";
  }
}
