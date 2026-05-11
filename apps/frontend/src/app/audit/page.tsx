"use client";
import { useState, useEffect } from "react";
import { api, type AuditLog } from "@/lib/api";

const eventColors: Record<string, string> = {
  TOOL_ALLOWED: "var(--success)",
  TOOL_EXECUTED: "var(--success)",
  TOOL_BLOCKED: "var(--danger)",
  TOOL_FAILED: "var(--danger)",
  TOOL_APPROVAL_REQUIRED: "var(--warning)",
  TOOL_APPROVED: "var(--approval)",
  TOOL_REJECTED: "var(--danger)",
  APPROVAL_EXPIRED: "var(--text-secondary)",
  POLICY_CREATED: "var(--accent)",
  POLICY_UPDATED: "var(--accent)",
  POLICY_DELETED: "var(--accent)",
  POLICY_TOGGLED: "var(--accent)",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 25;

  const load = (offset: number) => {
    api.listAuditLogs({ limit, offset }).then((r) => { setLogs(r.data); setTotal(r.total); }).catch(() => {});
  };
  useEffect(() => { load(page * limit); }, [page]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">📋 Audit Logs</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Complete audit trail of all policy decisions and tool executions. {total} total events.
        </p>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg-hover)" }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Time</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Event</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Tool</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t transition-colors" style={{ borderColor: "var(--border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: eventColors[log.eventType] ?? "var(--border)", color: "#000" }}>
                    {log.eventType}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{log.toolName ?? "—"}</td>
                <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  {log.details ? JSON.stringify(log.details).slice(0, 100) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-8 text-center" style={{ color: "var(--text-secondary)" }}>No audit logs yet.</div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-30" style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}>
            ← Prev
          </button>
          <span className="px-3 py-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            Page {page + 1} of {Math.ceil(total / limit)}
          </span>
          <button onClick={() => setPage(page + 1)} disabled={(page + 1) * limit >= total}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-30" style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
