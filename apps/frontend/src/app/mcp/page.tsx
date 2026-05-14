"use client";

import { useState, useEffect } from "react";
import { api, type McpTool } from "@/lib/api";
import { File, ServerCog, Wrench, ChevronDown, ChevronUp } from "lucide-react";

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
    <div className="space-y-6">
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="skeleton-line h-5 w-5 rounded" />
            <div className="space-y-1.5">
              <div className="skeleton-line h-5 w-32" />
              <div className="skeleton-line h-3 w-48" />
            </div>
          </div>
          <div className="skeleton-line h-5 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl p-3 space-y-2 min-h-0"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="skeleton-line h-3 w-20" />
              <div className="skeleton-line h-2 w-full" />
              <div className="skeleton-line h-2 w-3/4" />
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card p-5">
        <div className="skeleton-line h-4 w-40 mb-3" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-line h-6 w-36 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ToolCard({
  tool,
}: {
  tool: { id: string; name: string; description: string };
}) {
  const [open, setOpen] = useState(false);
  const desc = tool.description?.trim() || "No description";
  const long = desc.length > 140;

  return (
    <div
      className="rounded-xl p-3 min-w-0 max-w-full flex flex-col gap-1 transition-all duration-200 hover:bg-blue-500/[0.06] hover:border-blue-500/20"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-start gap-1.5 min-w-0">
        <Wrench size={12} className="shrink-0 mt-0.5" style={{ color: "#7BA3EB" }} />
        <code className="text-[11px] font-semibold truncate leading-tight" style={{ color: "#E2E8F0" }}>
          {tool.name}
        </code>
      </div>
      <p
        className={`text-[10px] leading-relaxed pl-4 min-h-0 ${open ? "" : "line-clamp-3"}`}
        style={{ color: "#94A3B8" }}
        title={long && !open ? desc : undefined}
      >
        {desc}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[10px] pl-4 flex items-center gap-0.5 mt-0.5 transition-colors hover:text-sky-400"
          style={{ color: "#64748B" }}
        >
          {open ? (
            <>
              Show less <ChevronUp size={12} />
            </>
          ) : (
            <>
              Read more <ChevronDown size={12} />
            </>
          )}
        </button>
      ) : null}
    </div>
  );
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
    <div className="space-y-6 animate-fade-in-up max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(14,165,233,0.2), rgba(14,165,233,0.08))",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <ServerCog size={20} style={{ color: "#0EA5E9" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">MCP Servers</h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            Connected servers and dynamically discovered tools.
          </p>
        </div>
      </div>

      {loading ? (
        <McpSkeleton />
      ) : (
        <>
          {servers.map((server) => (
            <div key={server.id} className="glass-card p-5 space-y-4 min-w-0 overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <File
                    size={18}
                    className="shrink-0 mt-0.5"
                    style={{
                      color: server.status === "CONNECTED" ? "#22C55E" : "#EF4444",
                      filter:
                        server.status === "CONNECTED" ? "drop-shadow(0 0 6px rgba(34,197,94,0.4))" : "none",
                    }}
                  />
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold truncate">{server.name}</h2>
                    <p
                      className="text-[11px] font-mono mt-0.5 truncate max-w-[min(100%,520px)]"
                      style={{ color: "#64748B" }}
                      title={`${server.transport} · ${server.command ?? ""}`}
                    >
                      {server.transport} · {server.command ?? "—"}
                    </p>
                  </div>
                </div>
                <span
                  className="status-badge shrink-0"
                  style={{
                    background:
                      server.status === "CONNECTED"
                        ? "rgba(34,197,94,0.1)"
                        : "rgba(239,68,68,0.1)",
                    color: server.status === "CONNECTED" ? "#22C55E" : "#EF4444",
                    border: `1px solid ${server.status === "CONNECTED" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}
                >
                  {server.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 min-w-0">
                {server.tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          ))}

          <div className="glass-card p-5 min-w-0 overflow-hidden">
            <h2 className="text-sm font-semibold mb-3">All discovered tools ({tools.length})</h2>
            <div className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <span
                  key={t.name}
                  className="inline-flex max-w-full items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all hover:bg-blue-500/5 hover:border-blue-500/20 min-w-0"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#E2E8F0",
                  }}
                  title={t.description}
                >
                  <span className="truncate">{t.name}</span>
                  <span className="shrink-0 opacity-60 text-[10px]">({t.serverName})</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
