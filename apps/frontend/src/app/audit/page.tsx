"use client";
import { useState, useEffect } from "react";
import { api, type AuditLog } from "@/lib/api";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";

const eventStyles: Record<string, { bg: string; color: string; border: string }> = {
  TOOL_EXECUTED:        { bg: "rgba(214,235,253,0.06)", color: "#D6EBFD", border: "rgba(214,235,253,0.10)" },
  TOOL_BLOCKED:         { bg: "rgba(239,68,68,0.08)",   color: "#EF4444", border: "rgba(239,68,68,0.14)" },
  TOOL_FAILED:          { bg: "rgba(239,68,68,0.08)",   color: "#EF4444", border: "rgba(239,68,68,0.14)" },
  TOOL_APPROVAL_REQUIRED: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "rgba(245,158,11,0.14)" },
  TOOL_APPROVED:        { bg: "rgba(214,235,253,0.06)", color: "#D6EBFD", border: "rgba(214,235,253,0.10)" },
  TOOL_REJECTED:        { bg: "rgba(239,68,68,0.08)",   color: "#EF4444", border: "rgba(239,68,68,0.14)" },
  POLICY_CREATED:       { bg: "rgba(255,255,255,0.04)", color: "#A1A4A5", border: "rgba(255,255,255,0.08)" },
  POLICY_UPDATED:       { bg: "rgba(255,255,255,0.04)", color: "#A1A4A5", border: "rgba(255,255,255,0.08)" },
  POLICY_TOGGLED:       { bg: "rgba(255,255,255,0.04)", color: "#A1A4A5", border: "rgba(255,255,255,0.08)" },
  POLICY_DELETED:       { bg: "rgba(239,68,68,0.06)",   color: "#EF4444", border: "rgba(239,68,68,0.10)" },
};
const fallback = { bg: "rgba(255,255,255,0.03)", color: "var(--text-subtle)", border: "var(--border-primary)" };

function AuditSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="glass-card"
          style={{
            padding:    "10px 16px",
            display:    "flex",
            alignItems: "center",
            gap:        16,
          }}
        >
          <div className="skeleton-line" style={{ height: 11, width: 130, flexShrink: 0 }} />
          <div className="skeleton-line" style={{ height: 18, width: 120, borderRadius: 999, flexShrink: 0 }} />
          <div className="skeleton-line" style={{ height: 11, width: 80, flexShrink: 0 }} />
          <div className="skeleton-line" style={{ height: 11, flex: 1 }} />
        </div>
      ))}
    </div>
  );
}

export default function AuditPage() {
  const [logs, setLogs]     = useState<AuditLog[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    api
      .listAuditLogs({ limit, offset: page * limit })
      .then((r) => { setLogs(r.data); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div className="page-header-icon" style={{ width: 56, height: 56 }}>
          <ScrollText size={22} style={{ color: "var(--accent-primary)", position: "relative" }} />
        </div>
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">
            {total > 0 ? `${total} total events` : "Tool execution and policy history."}
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <AuditSkeleton />
      ) : (
        <div
          className="glass-card"
          style={{ overflow: "hidden" }}
        >
          <table className="premium-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Tool</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const s = eventStyles[log.eventType] || fallback;
                return (
                  <tr key={log.id}>
                    <td
                      style={{
                        whiteSpace:  "nowrap",
                        fontSize:    "var(--text-xs)",
                        fontFamily:  "var(--font-mono)",
                        color:       "var(--text-disabled)",
                        flexShrink:  0,
                        width:       130,
                      }}
                    >
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month:   "short",
                        day:     "numeric",
                        hour:    "2-digit",
                        minute:  "2-digit",
                        second:  "2-digit",
                      })}
                    </td>
                    <td style={{ width: 160 }}>
                      <span
                        className="status-badge"
                        style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                      >
                        {log.eventType.replace("TOOL_", "").replace("POLICY_", "P:")}
                      </span>
                    </td>
                    <td style={{ width: 120 }}>
                      <code
                        style={{
                          fontSize:   "var(--text-xs)",
                          fontFamily: "var(--font-mono)",
                          color:      "var(--accent-primary)",
                        }}
                      >
                        {log.toolName || "—"}
                      </code>
                    </td>
                    <td
                      style={{
                        fontSize:     "var(--text-xs)",
                        overflow:     "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace:   "nowrap",
                        maxWidth:     400,
                        color:        "var(--text-disabled)",
                      }}
                    >
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div
          className="glass-card"
          style={{ padding: 48, textAlign: "center", color: "var(--text-subtle)" }}
        >
          No audit logs yet.
        </div>
      )}

      {/* ── Pagination ── */}
      {total > limit && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="btn-ghost"
            style={{ padding: "6px 8px", opacity: page === 0 ? 0.2 : 1 }}
          >
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
            {page + 1} / {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * limit >= total}
            className="btn-ghost"
            style={{ padding: "6px 8px", opacity: (page + 1) * limit >= total ? 0.2 : 1 }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
