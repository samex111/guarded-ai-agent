"use client";
import { useState, useEffect } from "react";
import { api, type Approval } from "@/lib/api";

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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">✅ Pending Approvals</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Review and approve or reject tool execution requests.
        </p>
      </div>

      {loading && approvals.length === 0 ? (
        <div className="rounded-xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
          Loading approvals...
        </div>
      ) : approvals.length === 0 ? (
        <div className="rounded-xl p-12 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-lg font-semibold">No Pending Approvals</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>All clear! No tool executions are waiting for approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border p-5 animate-fade-in transition-all"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">⏳</span>
                    <span className="font-semibold font-mono">{a.toolName}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: "var(--warning)", color: "#000" }}>
                      PENDING
                    </span>
                  </div>
                  <div className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
                    <p>Arguments: <code className="px-1 py-0.5 rounded" style={{ background: "var(--bg-hover)" }}>
                      {JSON.stringify(a.arguments, null, 0)}
                    </code></p>
                    <p>Expires in: <span style={{ color: "var(--warning)" }}>{timeLeft(a.expiresAt)}</span></p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    id={`btn-approve-${a.id}`}
                    onClick={() => approve(a.id)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: "var(--success)", color: "#000" }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    id={`btn-reject-${a.id}`}
                    onClick={() => reject(a.id)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: "var(--danger)", color: "#000" }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
