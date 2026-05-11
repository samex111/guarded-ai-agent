/**
 * API client for the Guarded AI Agent backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data as T;
}

// ─── Types ───────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  status: string;
  totalTokens: number;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
  messages?: Message[];
  toolCalls?: ToolCallRecord[];
}

export interface Message {
  id: string;
  role: string;
  content: string | null;
  toolCallId: string | null;
  toolName: string | null;
  createdAt: string;
}

export interface ToolCallRecord {
  id: string;
  toolName: string;
  serverName: string;
  arguments: unknown;
  result: unknown;
  status: string;
  policyDecision: string | null;
  error: string | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  ruleType: string;
  action: string;
  toolPattern: string;
  serverPattern: string | null;
  conditions: Record<string, unknown>;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  toolCallId: string;
  conversationId: string;
  policyRuleId: string;
  toolName: string;
  arguments: unknown;
  status: string;
  decidedBy: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface McpTool {
  name: string;
  description: string;
  serverName: string;
  serverId: string;
}

export interface AuditLog {
  id: string;
  eventType: string;
  toolName: string | null;
  details: unknown;
  createdAt: string;
  conversationId: string | null;
}

// ─── API Functions ───────────────────────────────────────

export const api = {
  // Conversations
  listConversations: () =>
    request<{ success: boolean; data: Conversation[] }>("/api/conversations"),
  getConversation: (id: string) =>
    request<{ success: boolean; data: Conversation }>(`/api/conversations/${id}`),
  createConversation: (title?: string) =>
    request<{ success: boolean; data: Conversation }>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  chat: (conversationId: string, message: string) =>
    request<{
      success: boolean;
      data: {
        content: string;
        conversationId: string;
        toolCalls: Array<{
          toolName: string;
          success: boolean;
          policyAction: string;
          latencyMs?: number;
        }>;
        tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
      };
    }>(`/api/conversations/${conversationId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // Policies
  listPolicies: () =>
    request<{ success: boolean; data: PolicyRule[] }>("/api/policies"),
  createPolicy: (data: Partial<PolicyRule>) =>
    request<{ success: boolean; data: PolicyRule }>("/api/policies", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePolicy: (id: string, data: Partial<PolicyRule>) =>
    request<{ success: boolean; data: PolicyRule }>(`/api/policies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deletePolicy: (id: string) =>
    request<{ success: boolean }>(`/api/policies/${id}`, { method: "DELETE" }),
  togglePolicy: (id: string) =>
    request<{ success: boolean; data: PolicyRule }>(`/api/policies/${id}/toggle`, {
      method: "PATCH",
    }),

  // Approvals
  listApprovals: () =>
    request<{ success: boolean; data: Approval[] }>("/api/approvals"),
  approveRequest: (id: string) =>
    request<{ success: boolean; data: Approval }>(`/api/approvals/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ decidedBy: "admin" }),
    }),
  rejectRequest: (id: string) =>
    request<{ success: boolean; data: Approval }>(`/api/approvals/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ decidedBy: "admin" }),
    }),

  // MCP
  listMcpServers: () =>
    request<{ success: boolean; data: unknown[] }>("/api/mcp/servers"),
  listMcpTools: () =>
    request<{ success: boolean; data: McpTool[] }>("/api/mcp/tools"),

  // Audit
  listAuditLogs: (params?: { limit?: number; offset?: number; eventType?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.eventType) qs.set("eventType", params.eventType);
    return request<{ success: boolean; data: AuditLog[]; total: number }>(
      `/api/audit?${qs.toString()}`,
    );
  },
};
