"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type LeadFull } from "@/lib/api";
import {
  ArrowLeft, Star, ExternalLink, Mail, Phone, Globe, Code2,
  FileText, BarChart3, ChevronDown, ChevronRight, Loader2,
  BookOpen, Link2,
} from "lucide-react";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [lead, setLead] = useState<LeadFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawExpanded, setRawExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getLeadById(id)
      .then((r) => setLead(r.data))
      .catch(() => setLead(null))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleFavorite = async () => {
    if (!lead) return;
    try {
      const r = await api.toggleFavorite(lead.id, !lead.isFavorite);
      setLead(r.data);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "#D6EBFD" }} />
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: "#F0F0F0" }}>Lead not found</p>
        <button onClick={() => router.push("/leads")} style={backBtnStyle}>
          <ArrowLeft size={14} /> Back to Leads
        </button>
      </div>
    );
  }

  const socials = lead.socials as Record<string, string> | null;
  const pages = lead.pages as Record<string, string> | null;
  const seo = lead.seo as Record<string, unknown> | null;
  const perf = lead.performance as Record<string, unknown> | null;
  const techs = lead.technologies as string[] | null;
  const priorityColor = lead.priority === "HIGH" ? "#EF4444" : lead.priority === "MEDIUM" ? "#F59E0B" : "#6B7280";

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 960, margin: "0 auto", padding: "0 0 60px" }}>
      {/* Back button */}
      <button onClick={() => router.push("/leads")} style={backBtnStyle}>
        <ArrowLeft size={14} /> Back to Leads
      </button>

      {/* ═════════════ SECTION 1 — HERO ═════════════ */}
      <div style={{
        marginTop: 20,
        padding: "28px 28px 24px",
        borderRadius: 20,
        background: "linear-gradient(180deg, rgba(20,21,23,0.95), rgba(14,15,17,0.98))",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(80,80,80,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, position: "relative", zIndex: 1 }}>
          {/* Logo */}
          {lead.logo ? (
            <img src={lead.logo} alt="" style={{
              width: 64, height: 64, borderRadius: 16, objectFit: "cover",
              border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", flexShrink: 0,
            }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              fontSize: 26, fontWeight: 700, color: "#444",
            }}>
              {(lead.name ?? "?")[0]?.toUpperCase()}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#F8F8F8", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              {lead.name || "Unnamed Lead"}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              {/* Website */}
              <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "center", gap: 5,
                color: "#D6EBFD", fontSize: 13, textDecoration: "none",
                fontFamily: "var(--font-mono, monospace)",
              }}>
                <Globe size={12} style={{ opacity: 0.5 }} />
                {lead.website}
                <ExternalLink size={10} style={{ opacity: 0.3 }} />
              </a>
            </div>

            {/* Badges row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <Badge bg={`${priorityColor}12`} color={priorityColor} border={`${priorityColor}22`}>
                {lead.priority ?? "—"}
              </Badge>
              <Badge bg="rgba(52,211,153,0.08)" color="#34D399" border="rgba(52,211,153,0.12)">
                Score {lead.leadScore}
              </Badge>
              <Badge bg="rgba(168,162,158,0.08)" color="#A8A29E" border="rgba(168,162,158,0.12)">
                Confidence {lead.confidence}%
              </Badge>
              {lead.isEnriched && (
                <Badge bg="rgba(96,165,250,0.08)" color="#60A5FA" border="rgba(96,165,250,0.12)">
                  ✓ Enriched
                </Badge>
              )}
            </div>
          </div>

          {/* Favorite */}
          <button onClick={toggleFavorite} style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            border: "1px solid rgba(255,255,255,0.06)",
            background: lead.isFavorite ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
            color: lead.isFavorite ? "#F59E0B" : "#555",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 200ms",
          }}>
            <Star size={18} fill={lead.isFavorite ? "#F59E0B" : "none"} />
          </button>
        </div>
      </div>

      {/* ═════════════ SECTION 2 — DESCRIPTION ═════════════ */}
      {(lead.description || lead.keywords || lead.businessType || lead.industry) && (
        <Section title="About" icon={<FileText size={15} />}>
          {lead.description && (
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "#B0B0B0", marginBottom: 16 }}>
              {lead.description}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {lead.businessType && <InfoChip label="Type" value={lead.businessType} />}
            {lead.industry && <InfoChip label="Industry" value={lead.industry} />}
          </div>
          {lead.keywords && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
                Keywords
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {lead.keywords.split(",").map((k) => k.trim()).filter(Boolean).map((kw) => (
                  <span key={kw} style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 6,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    color: "#999",
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ═════════════ SECTION 3 — CONTACT ═════════════ */}
      {(lead.email || lead.phone || (socials && Object.keys(socials).length > 0)) && (
        <Section title="Contact" icon={<Mail size={15} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lead.email && (
              <ContactRow icon={<Mail size={14} />} label="Email" value={lead.email}
                href={`mailto:${lead.email}`}
                extra={lead.emailQuality ? <Badge bg="rgba(52,211,153,0.08)" color="#34D399" border="rgba(52,211,153,0.12)">{lead.emailQuality}</Badge> : null}
              />
            )}
            {lead.phone && (
              <ContactRow icon={<Phone size={14} />} label="Phone" value={lead.phone} href={`tel:${lead.phone}`} />
            )}
            {socials?.github && <ContactRow icon={<Link2 size={14} />} label="GitHub" value={socials.github} href={String(socials.github)} />}
            {socials?.linkedin && <ContactRow icon={<Link2 size={14} />} label="LinkedIn" value={String(socials.linkedin)} href={String(socials.linkedin)} />}
            {socials?.twitter && <ContactRow icon={<Link2 size={14} />} label="Twitter" value={String(socials.twitter)} href={String(socials.twitter)} />}
            {socials?.youtube && <ContactRow icon={<Link2 size={14} />} label="YouTube" value={String(socials.youtube)} href={String(socials.youtube)} />}
          </div>
        </Section>
      )}

      {/* ═════════════ SECTION 4 — IMPORTANT PAGES ═════════════ */}
      {pages && Object.keys(pages).length > 0 && (
        <Section title="Important Pages" icon={<BookOpen size={15} />}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {Object.entries(pages).map(([key, value]) => (
              <a key={key} href={String(value)} target="_blank" rel="noopener noreferrer" style={pageCardStyle}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#D0D0D0", textTransform: "capitalize" }}>
                  {pageIcon(key)} {key}
                </span>
                <span style={{
                  fontSize: 11, color: "#666", fontFamily: "var(--font-mono, monospace)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {String(value)}
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* ═════════════ SECTION 5 — TECHNOLOGIES ═════════════ */}
      {techs && techs.length > 0 && (
        <Section title="Technologies" icon={<Code2 size={15} />}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {techs.map((tech) => (
              <span key={String(tech)} style={{
                fontSize: 12, fontWeight: 500,
                padding: "5px 12px", borderRadius: 8,
                background: "rgba(96,165,250,0.06)",
                border: "1px solid rgba(96,165,250,0.10)",
                color: "#93C5FD",
                letterSpacing: "-0.01em",
              }}>
                {String(tech)}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ═════════════ SECTION 6 — SEO ═════════════ */}
      {seo && Object.keys(seo).length > 0 && (
        <Section title="SEO Analysis" icon={<BarChart3 size={15} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {seo.title ? <SeoRow label="Title" value={String(seo.title)} /> : null}
            {seo.metaDescription ? <SeoRow label="Meta Description" value={String(seo.metaDescription)} /> : null}
            {seo.ogTitle ? <SeoRow label="OG Title" value={String(seo.ogTitle)} /> : null}
            {seo.ogDescription ? <SeoRow label="OG Description" value={String(seo.ogDescription)} /> : null}
            {seo.twitterCard ? <SeoRow label="Twitter Card" value={String(seo.twitterCard)} /> : null}
            {seo.h1Count !== undefined ? <SeoRow label="H1 Count" value={String(seo.h1Count)} /> : null}
            {seo.totalLinks !== undefined ? <SeoRow label="Total Links" value={String(seo.totalLinks)} /> : null}
            {seo.totalImages !== undefined ? <SeoRow label="Total Images" value={String(seo.totalImages)} /> : null}
          </div>
        </Section>
      )}

      {/* ═════════════ SECTION 7 — PERFORMANCE ═════════════ */}
      {perf && Object.keys(perf).length > 0 && (
        <Section title="Performance" icon={<BarChart3 size={15} />}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {perf.jsHeapUsedSize !== undefined && <MetricCard label="JS Heap" value={formatBytes(Number(perf.jsHeapUsedSize))} />}
            {perf.nodes !== undefined && <MetricCard label="DOM Nodes" value={String(perf.nodes)} />}
            {perf.documents !== undefined && <MetricCard label="Documents" value={String(perf.documents)} />}
            {perf.jsEventListeners !== undefined && <MetricCard label="Event Listeners" value={String(perf.jsEventListeners)} />}
          </div>
        </Section>
      )}

      {/* ═════════════ SECTION 8 — RAW JSON ═════════════ */}
      {lead.rawData && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setRawExpanded((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 16px", width: "100%",
              borderRadius: rawExpanded ? "14px 14px 0 0" : 14,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderBottom: rawExpanded ? "none" : "1px solid rgba(255,255,255,0.05)",
              color: "#888", fontSize: 13, fontWeight: 600,
              cursor: "pointer", textAlign: "left",
              transition: "all 150ms",
            }}
          >
            {rawExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            View Raw Scrape Data
          </button>
          {rawExpanded && (
            <pre style={{
              padding: 20,
              borderRadius: "0 0 14px 14px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderTop: "1px solid rgba(255,255,255,0.03)",
              color: "#888",
              fontSize: 11,
              lineHeight: 1.6,
              fontFamily: "var(--font-mono, monospace)",
              overflowX: "auto",
              maxHeight: 500,
            }}>
              {JSON.stringify(lead.rawData, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared Sub-components ────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: 20,
      padding: "22px 24px",
      borderRadius: 16,
      background: "rgba(255,255,255,0.015)",
      border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 16, fontSize: 14, fontWeight: 600, color: "#E0E0E0", letterSpacing: "-0.02em",
      }}>
        <span style={{ color: "#666" }}>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Badge({ bg, color, border, children }: { bg: string; color: string; border: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: "3px 10px", borderRadius: 6,
      background: bg, color, border: `1px solid ${border}`,
      letterSpacing: "0.01em",
    }}>
      {children}
    </span>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "5px 12px", borderRadius: 8,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#C0C0C0", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function ContactRow({ icon, label, value, href, extra }: {
  icon: React.ReactNode; label: string; value: string; href?: string; extra?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", borderRadius: 10,
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ color: "#555", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase", minWidth: 60 }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{
          color: "#D6EBFD", fontSize: 13, textDecoration: "none",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {value}
        </a>
      ) : (
        <span style={{ color: "#C0C0C0", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </span>
      )}
      {extra && <span style={{ marginLeft: "auto" }}>{extra}</span>}
    </div>
  );
}

function SeoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "8px 12px", borderRadius: 8,
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)",
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", minWidth: 110, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: "#A0A0A0", lineHeight: 1.5, wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 12,
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#E0E0E0", fontFamily: "var(--font-mono, monospace)", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function pageIcon(key: string): string {
  const k = key.toLowerCase();
  if (k.includes("pricing") || k.includes("price")) return "💰";
  if (k.includes("doc")) return "📄";
  if (k.includes("career") || k.includes("job")) return "💼";
  if (k.includes("contact")) return "📧";
  if (k.includes("blog")) return "📝";
  if (k.includes("about")) return "ℹ️";
  return "🔗";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const backBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8, marginTop: 8,
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
  color: "#999", fontSize: 13, fontWeight: 500, cursor: "pointer",
  textDecoration: "none", transition: "all 150ms",
};

const pageCardStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6,
  padding: "12px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
  textDecoration: "none", transition: "all 150ms",
};
