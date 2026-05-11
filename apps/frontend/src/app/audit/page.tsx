"use client";
import { useState, useEffect } from "react";
import { api, type AuditLog } from "@/lib/api";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const eventStyles: Record<string, { bg: string; color: string; border: string }> = {
  TOOL_EXECUTED: { bg: "rgba(34,197,94,0.1)", color: "#22C55E", border: "rgba(34,197,94,0.2)" },
  TOOL_BLOCKED: { bg: "rgba(239,68,68,0.1)", color: "#EF4444", border: "rgba(239,68,68,0.2)" },
  TOOL_FAILED: { bg: "rgba(239,68,68,0.1)", color: "#EF4444", border: "rgba(239,68,68,0.2)" },
  TOOL_APPROVAL_REQUIRED: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "rgba(245,158,11,0.2)" },
  TOOL_APPROVED: { bg: "rgba(59,130,246,0.1)", color: "#3B82F6", border: "rgba(59,130,246,0.2)" },
  TOOL_REJECTED: { bg: "rgba(239,68,68,0.1)", color: "#EF4444", border: "rgba(239,68,68,0.2)" },
  POLICY_CREATED: { bg: "rgba(124,58,237,0.1)", color: "#7C3AED", border: "rgba(124,58,237,0.2)" },
  POLICY_UPDATED: { bg: "rgba(124,58,237,0.1)", color: "#7C3AED", border: "rgba(124,58,237,0.2)" },
};

const fallback = { bg: "rgba(255,255,255,0.05)", color: "#64748B", border: "rgba(255,255,255,0.1)" };

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    api.listAuditLogs({ limit, offset: page * limit }).then((r) => { setLogs(r.data); setTotal(r.total); }).catch(() => {});
  }, [page]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.08))", border: "1px solid rgba(124,58,237,0.2)" }}>
          <ScrollText size={20} style={{ color: "#7C3AED" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit Logs</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{total} total events</p>
        </div>
      </div>

      <div className="space-y-2">
        {logs.map((log, i) => {
          const s = eventStyles[log.eventType] || fallback;
          return (
            <motion.div key={log.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="glass-card px-4 py-3 flex items-center gap-4">
              <span className="text-[11px] font-mono whitespace-nowrap shrink-0 w-[130px]" style={{ color: "var(--text-disabled)" }}>{new Date(log.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              <span className="status-badge shrink-0 min-w-[120px] justify-center" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{log.eventType.replace("TOOL_","").replace("POLICY_","P:")}</span>
              <code className="text-xs font-mono shrink-0 min-w-[80px]" style={{ color: "var(--accent-blue)" }}>{log.toolName || "—"}</code>
              <span className="text-xs truncate" style={{ color: "var(--text-disabled)" }}>{log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}</span>
            </motion.div>
          );
        })}
      </div>

      {logs.length === 0 && <div className="glass-card p-12 text-center" style={{ color: "var(--text-muted)" }}>No audit logs yet.</div>}

      {total > limit && (
        <div className="flex justify-center items-center gap-3">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 rounded-lg disabled:opacity-20" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}><ChevronLeft size={16} /></button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{page + 1} / {Math.ceil(total / limit)}</span>
          <button onClick={() => setPage(page + 1)} disabled={(page + 1) * limit >= total} className="p-2 rounded-lg disabled:opacity-20" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
