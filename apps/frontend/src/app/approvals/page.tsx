"use client";
import { useState, useEffect } from "react";
import { api, type Approval } from "@/lib/api";
import { CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";

function ApprovalSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1, 2].map((i) => (
        <div key={i} className="glass-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="skeleton-line" style={{ height: 14, width: 14, borderRadius: 4 }} />
                <div className="skeleton-line" style={{ height: 14, width: 120 }} />
                <div className="skeleton-line" style={{ height: 18, width: 70, borderRadius: 999 }} />
              </div>
              <div className="skeleton-line" style={{ height: 12, width: 280 }} />
              <div className="skeleton-line" style={{ height: 12, width: 160 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="skeleton-line" style={{ height: 34, width: 90, borderRadius: "var(--radius-md)" }} />
              <div className="skeleton-line" style={{ height: 34, width: 80, borderRadius: "var(--radius-md)" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = () => {
    setLoading(true);
    api.listApprovals().then((r) => setApprovals(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const approve = async (id: string) => { await api.approveRequest(id); load(); };
  const reject  = async (id: string) => { await api.rejectRequest(id);  load(); };

  const timeLeft = (expiresAt: string) => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 900 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div className="page-header-icon" style={{ width: 56, height: 56 }}>
          <ShieldAlert size={22} style={{ color: "var(--accent-primary)", position: "relative" }} />
        </div>
        <div>
          <h1 className="page-title">Pending Approvals</h1>
          <p className="page-subtitle">Review and approve or reject tool execution requests.</p>
        </div>
      </div>

      {/* ── Content ── */}
      {loading && approvals.length === 0 ? (
        <ApprovalSkeleton />
      ) : approvals.length === 0 ? (
        /* Empty state */
        <div
          className="glass-card"
          style={{ padding: 64, textAlign: "center" }}
        >
          <div
            style={{
              width:           52,
              height:          52,
              borderRadius:    "var(--radius-xl)",
              background:      "var(--gradient-card)",
              border:          "1px solid var(--border-secondary)",
              boxShadow:       "var(--shadow-card)",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              margin:          "0 auto 16px",
              position:        "relative",
              overflow:        "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "var(--gradient-overlay)" }} />
            <CheckCircle2 size={22} style={{ color: "var(--accent-primary)", position: "relative" }} />
          </div>
          <p
            style={{
              fontSize:   "var(--text-lg)",
              fontWeight: "var(--font-semibold)",
              color:      "var(--text-primary)",
            }}
          >
            All Clear
          </p>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)", marginTop: 6 }}>
            No tool executions waiting for approval.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {approvals.map((a) => (
            <div
              key={a.id}
              className="glass-card"
              style={{ padding: "20px" }}
            >
              <div
                style={{
                  display:        "flex",
                  alignItems:     "flex-start",
                  justifyContent: "space-between",
                  gap:            16,
                  flexWrap:       "wrap",
                }}
              >
                {/* Info */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Clock size={15} style={{ color: "#F59E0B", flexShrink: 0 }} />
                    <code
                      style={{
                        fontSize:   "var(--text-base)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: "var(--font-semibold)",
                        color:      "var(--text-primary)",
                      }}
                    >
                      {a.toolName}
                    </code>
                    <span
                      className="status-badge"
                      style={{
                        background: "rgba(245,158,11,0.08)",
                        color:      "#F59E0B",
                        border:     "1px solid rgba(245,158,11,0.15)",
                      }}
                    >
                      PENDING
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
                      Arguments:{" "}
                      <code
                        style={{
                          padding:      "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          fontSize:     "var(--text-xs)",
                          fontFamily:   "var(--font-mono)",
                          background:   "rgba(255,255,255,0.04)",
                          color:        "var(--text-muted)",
                          border:       "1px solid var(--border-primary)",
                        }}
                      >
                        {JSON.stringify(a.arguments, null, 0)}
                      </code>
                    </p>
                    <p
                      style={{
                        fontSize:   "var(--text-xs)",
                        color:      "var(--text-subtle)",
                        display:    "flex",
                        alignItems: "center",
                        gap:        6,
                      }}
                    >
                      <Clock size={10} />
                      Expires in:{" "}
                      <span style={{ color: "#F59E0B", fontWeight: "var(--font-medium)" }}>
                        {timeLeft(a.expiresAt)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    id={`btn-approve-${a.id}`}
                    onClick={() => approve(a.id)}
                    style={{
                      padding:      "8px 16px",
                      borderRadius: "var(--radius-md)",
                      fontSize:     "var(--text-sm)",
                      fontWeight:   "var(--font-semibold)",
                      display:      "flex",
                      alignItems:   "center",
                      gap:          6,
                      cursor:       "pointer",
                      background:   "rgba(214,235,253,0.05)",
                      color:        "var(--accent-primary)",
                      border:       "1px solid rgba(214,235,253,0.12)",
                      transition:   "background var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(214,235,253,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(214,235,253,0.05)")}
                  >
                    <CheckCircle2 size={13} />
                    Approve
                  </button>
                  <button
                    id={`btn-reject-${a.id}`}
                    onClick={() => reject(a.id)}
                    style={{
                      padding:      "8px 16px",
                      borderRadius: "var(--radius-md)",
                      fontSize:     "var(--text-sm)",
                      fontWeight:   "var(--font-semibold)",
                      display:      "flex",
                      alignItems:   "center",
                      gap:          6,
                      cursor:       "pointer",
                      background:   "var(--danger-bg)",
                      color:        "var(--danger)",
                      border:       "1px solid var(--danger-border)",
                      transition:   "background var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--danger-bg)")}
                  >
                    <XCircle size={13} />
                    Reject
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
