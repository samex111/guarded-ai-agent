"use client";

import { useState, useEffect } from "react";
import { api, type McpTool } from "@/lib/api";
import {
  ServerCog, Wrench, ChevronDown, ChevronUp,
  FolderTree, BadgeDollarSign, BrainCircuit, ChevronRight,
  Loader2, ServerOff,
} from "lucide-react";

interface McpServer {
  id: string;
  name: string;
  transport: string;
  command: string | null;
  status: string;
  enabled: boolean;
  tools: Array<{ id: string; name: string; description: string }>;
}

function McpSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {[1, 2].map((i) => (
        <div
          key={i}
          style={{
            padding: 28,
            borderRadius: 20,
            background: "linear-gradient(180deg, rgba(20,21,23,0.95), rgba(14,15,17,0.98))",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div className="skeleton-line" style={{ width: 48, height: 48, borderRadius: 14 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-line" style={{ height: 22, width: 160, borderRadius: 6 }} />
              <div className="skeleton-line" style={{ height: 14, width: 100, borderRadius: 6, marginTop: 8 }} />
            </div>
            <div className="skeleton-line" style={{ width: 100, height: 32, borderRadius: 20 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="skeleton-line" style={{ height: 120, borderRadius: 14 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ServerIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  const iconProps = { size: 20, style: { color: "#D6EBFD" } };
  if (n.includes("filesystem") || n.includes("file")) return <FolderTree {...iconProps} />;
  if (n.includes("lead")) return <BadgeDollarSign {...iconProps} />;
  if (n.includes("context")) return <BrainCircuit {...iconProps} />;
  return <ServerCog {...iconProps} />;
}

export default function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listMcpServers().then((r) => setServers(r.data as McpServer[])),
      api.listMcpTools().then((r) => setTools(r.data)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="animate-fade-in-up"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        paddingBottom: 40,
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(42deg, rgb(20,21,23), rgb(25,27,30))",
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "rgba(176,199,217,0.14) 0px 0px 0px 1px",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(rgba(80,80,80,0.15) 0%, rgba(0,0,0,0) 70%)",
          }} />
          <ServerCog size={22} style={{ color: "#F0F0F0", position: "relative" }} />
        </div>

        <div>
          <h1 style={{
            color: "#F8F8F8",
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}>
            MCP Servers
          </h1>
          <p style={{
            marginTop: 8,
            color: "#A1A4A5",
            fontSize: 14,
            lineHeight: 1.6,
          }}>
            Connected servers and dynamically discovered tools.
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <McpSkeleton />
      ) : servers.length === 0 ? (
        /* Empty state */
        <div style={{
          padding: 80,
          textAlign: "center",
          borderRadius: 20,
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <ServerOff size={24} style={{ color: "#555" }} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#E0E0E0", letterSpacing: "-0.02em" }}>
            No MCP servers connected
          </p>
          <p style={{ fontSize: 13, color: "#666", marginTop: 8, maxWidth: 360, margin: "8px auto 0" }}>
            Configure MCP servers in your backend to discover tools automatically.
          </p>
        </div>
      ) : (
        servers.map((server) => (
          <div
            key={server.id}
            style={{
              padding: 28,
              borderRadius: 20,
              background: "linear-gradient(180deg, rgba(20,21,23,0.95), rgba(14,15,17,0.98))",
              border: "1px solid rgba(255,255,255,0.04)",
              boxShadow: "rgba(176,199,217,0.10) 0px 0px 0px 1px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top fade */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(rgba(80,80,80,0.08) 0%, rgba(0,0,0,0) 60%)",
            }} />

            {/* Server Header */}
            <div style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              gap: 16, flexWrap: "wrap", position: "relative", zIndex: 1,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}>
                {/* Server Icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                  border: "1px solid rgba(255,255,255,0.04)",
                  boxShadow: "rgba(176,199,217,0.12) 0px 0px 0px 1px",
                }}>
                  <ServerIcon name={server.name} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <h2 style={{
                    color: "#F8F8F8",
                    fontSize: 26,
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                  }}>
                    {server.name}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <span style={{
                      color: "#555", fontSize: 11,
                      fontFamily: "var(--font-mono, monospace)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase" as const,
                    }}>
                      {server.transport}
                    </span>
                    <span style={{ color: "#333", fontSize: 10 }}>•</span>
                    <span style={{
                      color: "#777", fontSize: 12,
                      fontFamily: "var(--font-mono, monospace)",
                    }}>
                      {server.tools.length} tools
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 14px",
                borderRadius: 20,
                background: server.status === "CONNECTED"
                  ? "rgba(52,211,153,0.06)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${server.status === "CONNECTED"
                  ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.14)"}`,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: server.status === "CONNECTED" ? "#34D399" : "#EF4444",
                  boxShadow: server.status === "CONNECTED"
                    ? "0 0 8px rgba(52,211,153,0.4)" : "0 0 8px rgba(239,68,68,0.3)",
                  animation: server.status === "CONNECTED" ? "pulse 2s ease-in-out infinite" : "none",
                }} />
                <span style={{
                  color: server.status === "CONNECTED" ? "#34D399" : "#EF4444",
                  fontSize: 12, fontWeight: 500, letterSpacing: "-0.01em",
                }}>
                  {server.status === "CONNECTED" ? "Connected" : server.status}
                </span>
              </div>
            </div>

            {/* Tool Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
              marginTop: 24,
              position: "relative",
              zIndex: 1,
            }}>
              {server.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        ))
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function ToolCard({ tool }: { tool: { id: string; name: string; description: string } }) {
  const [expanded, setExpanded] = useState(false);
  const desc = tool.description?.trim() || "No description available";
  const isLong = desc.length > 120;

  return (
    <div
      style={{
        padding: "18px 18px 16px",
        borderRadius: 14,
        background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))",
        border: "1px solid rgba(255,255,255,0.04)",
        transition: "all 200ms ease",
        cursor: "default",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))";
        e.currentTarget.style.borderColor = "rgba(96,165,250,0.12)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <Wrench size={13} style={{ color: "#D6EBFD" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{
              color: "#F0F0F0", fontSize: 14, fontWeight: 600,
              letterSpacing: "-0.02em", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {tool.name}
            </h3>
            <ChevronRight size={13} style={{ color: "#444", flexShrink: 0 }} />
          </div>
        </div>
      </div>

      <p style={{
        marginTop: 10,
        fontSize: 12,
        lineHeight: 1.7,
        color: "#888",
        flex: 1,
        ...(!expanded && isLong ? {
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        } : {}),
      }}>
        {desc}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 8,
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            color: "#D6EBFD", fontSize: 11, fontWeight: 500,
            padding: 0, opacity: 0.8,
            transition: "opacity 150ms",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.8"; }}
        >
          {expanded ? (
            <>Show less <ChevronUp size={12} /></>
          ) : (
            <>Read more <ChevronDown size={12} /></>
          )}
        </button>
      )}
    </div>
  );
}
