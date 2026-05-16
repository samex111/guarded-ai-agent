"use client";

import { useState } from "react";
import { X, ExternalLink, Star, Mail, Phone, Globe, ChevronRight } from "lucide-react";
import type { LeadSummary } from "@/lib/api";

interface LeadDetailPanelProps {
  lead: LeadSummary | null;
  onClose: () => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
}

const priorityColor: Record<string, string> = {
  HIGH: "#EF4444",
  MEDIUM: "#F59E0B",
  LOW: "#6B7280",
};

export function LeadDetailPanel({ lead, onClose, onToggleFavorite }: LeadDetailPanelProps) {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  if (!lead) return null;

  const pColor = priorityColor[lead.priority] ?? "#6B7280";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 90,
          animation: "fadeIn 200ms ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(460px, 90vw)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, rgba(16,17,19,0.98), rgba(10,11,13,0.99))",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
          animation: "slideInRight 280ms cubic-bezier(0.16, 1, 0.3, 1)",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(14,15,17,0.95)",
            backdropFilter: "blur(12px)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "#A1A4A5", letterSpacing: "-0.01em" }}>
            Lead Preview
          </span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#888",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.color = "#888";
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Logo + Name + Priority */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            {lead.logo ? (
              <img
                src={lead.logo}
                alt=""
                style={{
                  width: 48, height: 48,
                  borderRadius: 12,
                  objectFit: "cover",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.03)",
                  flexShrink: 0,
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                style={{
                  width: 48, height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 20, fontWeight: 700, color: "#555",
                }}
              >
                {(lead.name ?? "?")[0]?.toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#F0F0F0", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                {lead.name || "Unnamed Lead"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span
                  style={{
                    fontSize: 11, fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: `${pColor}12`,
                    color: pColor,
                    border: `1px solid ${pColor}22`,
                    letterSpacing: "0.02em",
                  }}
                >
                  {lead.priority}
                </span>
                <span style={{ fontSize: 12, color: "#666" }}>·</span>
                <span style={{ fontSize: 12, color: "#A0A0A0", fontFamily: "var(--font-mono, monospace)" }}>
                  Score {lead.leadScore}
                </span>
              </div>
            </div>

            {/* Favorite */}
            <button
              onClick={() => onToggleFavorite?.(lead.id, !lead.isFavorite)}
              style={{
                width: 32, height: 32,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.06)",
                background: lead.isFavorite ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                color: lead.isFavorite ? "#F59E0B" : "#555",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 200ms",
                flexShrink: 0,
              }}
            >
              <Star size={14} fill={lead.isFavorite ? "#F59E0B" : "none"} />
            </button>
          </div>

          {/* Website */}
          <a
            href={lead.website}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setHoveredLink("website")}
            onMouseLeave={() => setHoveredLink(null)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              background: hoveredLink === "website" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#D6EBFD",
              fontSize: 13,
              textDecoration: "none",
              transition: "all 150ms",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            <Globe size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lead.website}
            </span>
            <ExternalLink size={12} style={{ marginLeft: "auto", opacity: 0.4, flexShrink: 0 }} />
          </a>

          {/* Description */}
          {lead.description && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#666", letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>
                Description
              </div>
              <p style={{
                fontSize: 13, lineHeight: 1.7, color: "#A1A4A5",
                display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>
                {lead.description}
              </p>
            </div>
          )}

          {/* Quick Info Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}>
            {lead.email && (
              <InfoCard icon={<Mail size={13} />} label="Email" value={lead.email} />
            )}
            {lead.industry && (
              <InfoCard icon={<Globe size={13} />} label="Industry" value={lead.industry} />
            )}
            {lead.businessType && (
              <InfoCard icon={<Globe size={13} />} label="Type" value={lead.businessType} />
            )}
            <InfoCard
              icon={<span style={{ fontSize: 13 }}>📊</span>}
              label="Confidence"
              value={`${lead.confidence}%`}
            />
          </div>

          {/* Status + Enriched */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11, fontWeight: 500,
              padding: "3px 10px", borderRadius: 6,
              background: lead.status === "SAVED" ? "rgba(214,235,253,0.06)" : "rgba(255,255,255,0.04)",
              color: lead.status === "SAVED" ? "#D6EBFD" : "#888",
              border: `1px solid ${lead.status === "SAVED" ? "rgba(214,235,253,0.10)" : "rgba(255,255,255,0.06)"}`,
            }}>
              {lead.status}
            </span>
            {lead.isEnriched && (
              <span style={{
                fontSize: 11, fontWeight: 500,
                padding: "3px 10px", borderRadius: 6,
                background: "rgba(52,211,153,0.08)",
                color: "#34D399",
                border: "1px solid rgba(52,211,153,0.12)",
              }}>
                ✓ Enriched
              </span>
            )}
          </div>

          {/* View Full Lead */}
          <a
            href={`/leads/${lead.id}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 20px",
              borderRadius: 10,
              background: "rgba(214,235,253,0.06)",
              border: "1px solid rgba(214,235,253,0.10)",
              color: "#D6EBFD",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 200ms",
              letterSpacing: "-0.01em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(214,235,253,0.10)";
              e.currentTarget.style.borderColor = "rgba(214,235,253,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(214,235,253,0.06)";
              e.currentTarget.style.borderColor = "rgba(214,235,253,0.10)";
            }}
          >
            View Full Lead
            <ChevronRight size={14} />
          </a>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      padding: "10px 12px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ color: "#666" }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: 13, color: "#D0D0D0", fontWeight: 500,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {value}
      </div>
    </div>
  );
}
