"use client";
import { useState, useEffect } from "react";
import { api, type Approval } from "@/lib/api";
import { CheckCircle2, XCircle, Clock, Shield } from "lucide-react";

function ApprovalSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="glass-card p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-3">
                <div className="skeleton-line h-4 w-4 rounded" />
                <div className="skeleton-line h-4 w-28" />
                <div className="skeleton-line h-5 w-16 rounded-full" />
              </div>
              <div className="skeleton-line h-3 w-72" />
              <div className="skeleton-line h-3 w-40" />
            </div>
            <div className="flex gap-2">
              <div className="skeleton-line h-8 w-24 rounded-xl" />
              <div className="skeleton-line h-8 w-20 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}>
          <Shield size={20} style={{ color: "#F59E0B" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pending Approvals</h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Review and approve or reject tool execution requests.</p>
        </div>
      </div>

      {loading && approvals.length === 0 ? (
        <ApprovalSkeleton />
      ) : approvals.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))", border: "1px solid rgba(34,197,94,0.2)" }}>
            <CheckCircle2 size={28} style={{ color: "#22C55E" }} />
          </div>
          <p className="text-base font-semibold">All Clear</p>
          <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>No tool executions waiting for approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => (
            <div key={a.id} className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <Clock size={16} style={{ color: "#F59E0B" }} />
                    <code className="text-sm font-semibold font-mono" style={{ color: "#3B82F6" }}>{a.toolName}</code>
                    <span className="status-badge" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>PENDING</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs" style={{ color: "#64748B" }}>
                      Arguments: <code className="px-1.5 py-0.5 rounded-md text-[11px]" style={{ background: "rgba(255,255,255,0.04)", color: "#CBD5E1" }}>{JSON.stringify(a.arguments, null, 0)}</code>
                    </p>
                    <p className="text-xs flex items-center gap-1.5" style={{ color: "#64748B" }}>
                      <Clock size={11} /> Expires in: <span style={{ color: "#F59E0B" }}>{timeLeft(a.expiresAt)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button id={`btn-approve-${a.id}`} onClick={() => approve(a.id)} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 hover:brightness-125" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button id={`btn-reject-${a.id}`} onClick={() => reject(a.id)} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 hover:brightness-125" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <XCircle size={14} /> Reject
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
