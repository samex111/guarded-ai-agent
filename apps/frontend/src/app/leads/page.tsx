"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type LeadSummary } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { ActivityStream } from "@/components/activity-stream";
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel";
import { Users, Loader2, Star, Search } from "lucide-react";

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
  const [leads, setLeads]           = useState<LeadSummary[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [status, setStatus]         = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch]         = useState("");

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

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
          id:           row.leadId,
          website:      row.website,
          name:         row.name ?? row.website,
          description:  null,
          email:        null,
          logo:         null,
          industry:     null,
          businessType: null,
          leadScore:    row.leadScore ?? 0,
          confidence:   0,
          priority:     row.priority ?? "LOW",
          status:       row.status,
          isEnriched:   false,
          isFavorite:   false,
          expiresAt:    row.expiresAt,
          pinned:       false,
          tags:         [],
          createdAt:    new Date().toISOString(),
          updatedAt:    new Date().toISOString(),
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

  const handleToggleFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    try {
      await api.toggleFavorite(id, isFavorite);
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, isFavorite } : l));
    } catch { /* ignore */ }
  }, []);

  // Filter by search
  const filteredLeads = search.trim()
    ? leads.filter((l) => {
        const q = search.toLowerCase();
        return (
          (l.name ?? "").toLowerCase().includes(q) ||
          l.website.toLowerCase().includes(q) ||
          (l.email ?? "").toLowerCase().includes(q) ||
          (l.industry ?? "").toLowerCase().includes(q)
        );
      })
    : leads;

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

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

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={14} style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "#555", pointerEvents: "none",
            }} />
            <input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="premium-input"
              style={{ width: 200, paddingLeft: 34, fontSize: 13 }}
            />
          </div>

          {/* Status filter */}
          <select
            className="premium-input"
            style={{ width: "auto", minWidth: 140, fontSize: 13 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="SAVED">Saved</option>
          </select>
        </div>
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
              width: 52, height: 52,
              borderRadius: "var(--radius-xl)",
              background: "var(--gradient-card)",
              border: "1px solid var(--border-secondary)",
              boxShadow: "var(--shadow-card)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              position: "relative",
              overflow: "hidden",
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
            <code style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)",
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-primary)",
              borderRadius: "var(--radius-sm)", padding: "1px 6px", color: "var(--accent-primary)",
            }}>analyze_website</code>{" "}
            to create leads.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th style={thStyle}>
                    <Star size={12} style={{ opacity: 0.3 }} />
                  </th>
                  <th style={thStyle}>Lead</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Industry</th>
                  <th style={thStyle}>Expires</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((L) => {
                  const pStyle = priorityStyle(L.priority);
                  const sStyle = statusStyle(L.status);
                  const isSelected = selectedId === L.id;
                  return (
                    <tr
                      key={L.id}
                      onClick={() => setSelectedId(L.id)}
                      style={{
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        background: isSelected ? "rgba(214,235,253,0.04)" : "transparent",
                        transition: "background 150ms",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* Favorite */}
                      <td style={{ ...tdStyle, width: 36, textAlign: "center" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(L.id, !L.isFavorite); }}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: L.isFavorite ? "#F59E0B" : "#333",
                            padding: 4, display: "flex", alignItems: "center",
                            transition: "color 150ms",
                          }}
                        >
                          <Star size={13} fill={L.isFavorite ? "#F59E0B" : "none"} />
                        </button>
                      </td>

                      {/* Lead Name + Website */}
                      <td style={{ ...tdStyle, minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {L.logo ? (
                            <img
                              src={L.logo}
                              alt=""
                              style={{
                                width: 28, height: 28, borderRadius: 7,
                                objectFit: "cover", flexShrink: 0,
                                border: "1px solid rgba(255,255,255,0.06)",
                                background: "rgba(255,255,255,0.03)",
                              }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div style={{
                              width: 28, height: 28, borderRadius: 7,
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#444",
                            }}>
                              {(L.name ?? "?")[0]?.toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              color: "#F0F0F0", fontWeight: 600, fontSize: 13,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              letterSpacing: "-0.01em",
                            }}>
                              {L.name || "—"}
                            </div>
                            <div style={{
                              color: "#555", fontSize: 11,
                              fontFamily: "var(--font-mono, monospace)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              maxWidth: 180,
                            }}>
                              {L.website}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            width: 32, height: 4, borderRadius: 2,
                            background: "rgba(255,255,255,0.06)",
                            overflow: "hidden",
                          }}>
                            <div style={{
                              width: `${Math.min(100, L.leadScore)}%`,
                              height: "100%",
                              borderRadius: 2,
                              background: L.leadScore >= 80 ? "#34D399" : L.leadScore >= 55 ? "#F59E0B" : "#666",
                              transition: "width 300ms",
                            }} />
                          </div>
                          <span style={{ color: "#C0C0C0", fontWeight: 600, fontSize: 12, fontFamily: "var(--font-mono, monospace)" }}>
                            {L.leadScore}
                          </span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          padding: "2px 8px", borderRadius: 5,
                          background: pStyle.bg, color: pStyle.color,
                          border: `1px solid ${pStyle.border}`,
                        }}>
                          {L.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 500,
                          padding: "2px 8px", borderRadius: 5,
                          background: sStyle.bg, color: sStyle.color,
                          border: `1px solid ${sStyle.border}`,
                        }}>
                          {L.status}
                        </span>
                      </td>

                      {/* Industry */}
                      <td style={{ ...tdStyle, color: "#777", fontSize: 12 }}>
                        {L.industry || L.businessType || "—"}
                      </td>

                      {/* Expires */}
                      <td style={{ ...tdStyle, fontSize: 11, color: "#555", whiteSpace: "nowrap" }}>
                        {L.expiresAt ? new Date(L.expiresAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Right Side Panel ── */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedId(null)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 600,
  color: "#555",
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  whiteSpace: "nowrap" as const,
  position: "sticky" as const,
  top: 0,
  background: "rgba(14,15,17,0.95)",
  backdropFilter: "blur(8px)",
  zIndex: 5,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  verticalAlign: "middle",
};
