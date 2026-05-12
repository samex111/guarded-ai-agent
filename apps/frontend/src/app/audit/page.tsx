"use client";
import { useState, useEffect } from "react";
import { api, type AuditLog } from "@/lib/api";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";

const eventStyles: Record<string, { bg: string; color: string; border: string }> = {
  TOOL_EXECUTED: { bg: "rgba(34,197,94,0.1)", color: "#22C55E", border: "rgba(34,197,94,0.2)" },
  TOOL_BLOCKED: { bg: "rgba(239,68,68,0.1)", color: "#EF4444", border: "rgba(239,68,68,0.2)" },
  TOOL_FAILED: { bg: "rgba(239,68,68,0.1)", color: "#EF4444", border: "rgba(239,68,68,0.2)" },
  TOOL_APPROVAL_REQUIRED: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "rgba(245,158,11,0.2)" },
  TOOL_APPROVED: { bg: "rgba(59,130,246,0.1)", color: "#3B82F6", border: "rgba(59,130,246,0.2)" },
  TOOL_REJECTED: { bg: "rgba(239,68,68,0.1)", color: "#EF4444", border: "rgba(239,68,68,0.2)" },
  POLICY_CREATED: { bg: "rgba(124,58,237,0.1)", color: "#7C3AED", border: "rgba(124,58,237,0.2)" },
  POLICY_UPDATED: { bg: "rgba(124,58,237,0.1)", color: "#7C3AED", border: "rgba(124,58,237,0.2)" },
  POLICY_TOGGLED: { bg: "rgba(124,58,237,0.1)", color: "#7C3AED", border: "rgba(124,58,237,0.2)" },
  POLICY_DELETED: { bg: "rgba(124,58,237,0.1)", color: "#7C3AED", border: "rgba(124,58,237,0.2)" },
};

const fallback = { bg: "rgba(255,255,255,0.05)", color: "#64748B", border: "rgba(255,255,255,0.1)" };

function AuditSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="glass-card px-4 py-3 flex items-center gap-4">
          <div className="skeleton-line h-3 w-[130px]" />
          <div className="skeleton-line h-5 w-[120px] rounded-full" />
          <div className="skeleton-line h-3 w-[80px]" />
          <div className="skeleton-line h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    api.listAuditLogs({ limit, offset: page * limit }).then((r) => { setLogs(r.data); setTotal(r.total); }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.08))", border: "1px solid rgba(124,58,237,0.2)" }}>
          <ScrollText size={20} style={{ color: "#7C3AED" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit Logs</h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{total} total events</p>
        </div>
      </div>

      {loading ? <AuditSkeleton /> : (
        <div className="space-y-2">
          {logs.map((log) => {
            const s = eventStyles[log.eventType] || fallback;
            return (
              <div key={log.id} className="glass-card px-4 py-3 flex items-center gap-4">
                <span className="text-[11px] font-mono whitespace-nowrap shrink-0 w-[130px]" style={{ color: "#475569" }}>{new Date(log.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <span className="status-badge shrink-0 min-w-[120px] justify-center" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{log.eventType.replace("TOOL_", "").replace("POLICY_", "P:")}</span>
                <code className="text-xs font-mono shrink-0 min-w-[80px]" style={{ color: "#3B82F6" }}>{log.toolName || "—"}</code>
                <span className="text-xs truncate" style={{ color: "#475569" }}>{log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}</span>
              </div>
            );
          })}
        </div>
      )}

      {!loading && logs.length === 0 && <div className="glass-card p-12 text-center" style={{ color: "#64748B" }}>No audit logs yet.</div>}

      {total > limit && (
        <div className="flex justify-center items-center gap-3">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 rounded-lg disabled:opacity-20" style={{ background: "rgba(255,255,255,0.04)", color: "#64748B" }}><ChevronLeft size={16} /></button>
          <span className="text-xs" style={{ color: "#64748B" }}>{page + 1} / {Math.ceil(total / limit)}</span>
          <button onClick={() => setPage(page + 1)} disabled={(page + 1) * limit >= total} className="p-2 rounded-lg disabled:opacity-20" style={{ background: "rgba(255,255,255,0.04)", color: "#64748B" }}><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
