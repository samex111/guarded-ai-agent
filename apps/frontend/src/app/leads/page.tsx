"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type LeadSummary } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { ActivityStream } from "@/components/activity-stream";
import { Users, Loader2 } from "lucide-react";

const priorityStyle = (p: string) => {
  if (p === "HIGH")   return { bg: "rgba(239,68,68,0.08)",   color: "#EF4444", border: "rgba(239,68,68,0.14)" };
  if (p === "MEDIUM") return { bg: "rgba(245,158,11,0.08)",  color: "#F59E0B", border: "rgba(245,158,11,0.14)" };
  return                     { bg: "rgba(255,255,255,0.04)", color: "var(--text-subtle)", border: "var(--border-primary)" };
};

const statusStyle = (s: string) => {
  if (s === "SAVED")      return { bg: "rgba(214,235,253,0.06)", color: "#D6EBFD", border: "rgba(214,235,253,0.10)" };
  if (s === "TEMPORARY")  return { bg: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "var(--border-secondary)" };
  return                         { bg: "rgba(255,255,255,0.03)", color: "var(--text-subtle)", border: "var(--border-primary)" };
};

export default function LeadsPage() {
  const [leads, setLeads]   = useState<LeadSummary[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .listLeads({ page: 1, pageSize: 50, status: status || undefined })
      .then((r) => {
        setLeads(r.data.items);
        setTotal(r.data.total);
      })
      .catch(() => {
        setLeads([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const sock = getSocket();

    const onCreated = (row: {
      leadId: string;
      website: string;
      status: string;
      expiresAt: string | null;
      leadScore?: number;
      priority?: string;
      name?: string;
    }) => {
      setLeads((prev) => {
        if (prev.some((l) => l.id === row.leadId)) return prev;
        const item: LeadSummary = {
          id:         row.leadId,
          website:    row.website,
          name:       row.name ?? row.website,
          leadScore:  row.leadScore ?? 0,
          confidence: 0,
          priority:   row.priority ?? "LOW",
          status:     row.status,
          expiresAt:  row.expiresAt,
          pinned:     false,
          tags:       [],
          createdAt:  new Date().toISOString(),
          updatedAt:  new Date().toISOString(),
        };
        return [item, ...prev];
      });
      setTotal((t) => t + 1);
    };

    const onUpdated = () => { load(); };

    sock.on("lead:created", onCreated);
    sock.on("lead:updated", onUpdated);
    sock.on("lead:saved",   onUpdated);
    sock.on("lead:deleted", onUpdated);

    return () => {
      sock.off("lead:created", onCreated);
      sock.off("lead:updated", onUpdated);
      sock.off("lead:saved",   onUpdated);
      sock.off("lead:deleted", onUpdated);
    };
  }, [load]);

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div className="page-header-icon" style={{ width: 56, height: 56 }}>
            <Users size={22} style={{ color: "var(--accent-primary)", position: "relative" }} />
          </div>
          <div>
            <h1 className="page-title">Leads</h1>
            <p className="page-subtitle">
              {total} total — temporary leads expire after 24h unless saved.
            </p>
          </div>
        </div>

        {/* Status filter */}
        <select
          className="premium-input"
          style={{ width: "auto", minWidth: 160, marginTop: 8 }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="TEMPORARY">Temporary</option>
          <option value="SAVED">Saved</option>
        </select>
      </div>

      {/* ── Activity stream ── */}
      <ActivityStream mode="ingestion" />

      {/* ── Table / States ── */}
      {loading && leads.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, display: "flex", justifyContent: "center" }}>
          <Loader2 className="animate-spin" style={{ color: "var(--accent-primary)" }} size={26} />
        </div>
      ) : leads.length === 0 ? (
        <div className="glass-card" style={{ padding: 64, textAlign: "center" }}>
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
            <Users size={22} style={{ color: "var(--accent-primary)", position: "relative" }} />
          </div>
          <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--text-primary)" }}>
            No leads yet
          </p>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)", marginTop: 6 }}>
            Use the agent with{" "}
            <code
              style={{
                fontFamily:   "var(--font-mono)",
                fontSize:     "var(--text-xs)",
                background:   "rgba(255,255,255,0.04)",
                border:       "1px solid var(--border-primary)",
                borderRadius: "var(--radius-sm)",
                padding:      "1px 6px",
                color:        "var(--accent-primary)",
              }}
            >
              analyze_website
            </code>{" "}
            or POST{" "}
            <code
              style={{
                fontFamily:   "var(--font-mono)",
                fontSize:     "var(--text-xs)",
                background:   "rgba(255,255,255,0.04)",
                border:       "1px solid var(--border-primary)",
                borderRadius: "var(--radius-sm)",
                padding:      "1px 6px",
                color:        "var(--text-muted)",
              }}
            >
              /api/public/scrape
            </code>
            .
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Website</th>
                <th>Score</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((L) => {
                const pStyle = priorityStyle(L.priority);
                const sStyle = statusStyle(L.status);
                return (
                  <tr key={L.id}>
                    <td style={{ color: "var(--text-primary)", fontWeight: "var(--font-medium)" }}>
                      {L.name || "—"}
                    </td>
                    <td
                      style={{
                        maxWidth:     220,
                        overflow:     "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace:   "nowrap",
                        color:        "var(--text-subtle)",
                        fontFamily:   "var(--font-mono)",
                        fontSize:     "var(--text-xs)",
                      }}
                    >
                      {L.website}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontWeight: "var(--font-medium)" }}>
                      {L.leadScore}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ background: pStyle.bg, color: pStyle.color, border: `1px solid ${pStyle.border}` }}
                      >
                        {L.priority}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ background: sStyle.bg, color: sStyle.color, border: `1px solid ${sStyle.border}` }}
                      >
                        {L.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "var(--text-xs)", color: "var(--text-disabled)", whiteSpace: "nowrap" }}>
                      {L.expiresAt ? new Date(L.expiresAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
