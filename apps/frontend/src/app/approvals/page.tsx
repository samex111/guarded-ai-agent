"use client";
import { useState, useEffect } from "react";
import { api, type Approval } from "@/lib/api";
import { CheckCircle2, XCircle, Clock, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.listApprovals().then((r) => setApprovals(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); const interval = setInterval(load, 5000); return () => clearInterval(interval); }, []);

  const approve = async (id: string) => { await api.approveRequest(id); load(); };
  const reject = async (id: string) => { await api.rejectRequest(id); load(); };

  const timeLeft = (expiresAt: string) => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <Shield size={20} style={{ color: "var(--warning)" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pending Approvals</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Review and approve or reject tool execution requests.
          </p>
        </div>
      </div>

      {loading && approvals.length === 0 ? (
        <div className="glass-card p-8 text-center" style={{ color: "var(--text-muted)" }}>
          Loading approvals...
        </div>
      ) : approvals.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <CheckCircle2 size={28} style={{ color: "var(--success)" }} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>All Clear</p>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>No tool executions waiting for approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {approvals.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <Clock size={16} style={{ color: "var(--warning)" }} />
                      <code className="text-sm font-semibold font-mono" style={{ color: "var(--accent-blue)" }}>
                        {a.toolName}
                      </code>
                      <span className="status-badge" style={{ background: "rgba(245,158,11,0.12)", color: "var(--warning)", border: "1px solid rgba(245,158,11,0.2)" }}>
                        PENDING
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Arguments:{" "}
                        <code className="px-1.5 py-0.5 rounded-md text-[11px]" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)" }}>
                          {JSON.stringify(a.arguments, null, 0)}
                        </code>
                      </p>
                      <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                        <Clock size={11} />
                        Expires in: <span style={{ color: "var(--warning)" }}>{timeLeft(a.expiresAt)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      id={`btn-approve-${a.id}`}
                      onClick={() => approve(a.id)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-300"
                      style={{
                        background: "rgba(34,197,94,0.12)",
                        color: "var(--success)",
                        border: "1px solid rgba(34,197,94,0.2)",
                      }}
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button
                      id={`btn-reject-${a.id}`}
                      onClick={() => reject(a.id)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-300"
                      style={{
                        background: "rgba(239,68,68,0.12)",
                        color: "var(--danger)",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
