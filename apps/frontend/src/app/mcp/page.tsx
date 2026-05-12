"use client";
import { useState, useEffect } from "react";
import { api, type McpTool } from "@/lib/api";
import { File, ServerCog, Wrench } from "lucide-react";

interface McpServer {
  id: string; name: string; transport: string; command: string | null;
  status: string; enabled: boolean; tools: Array<{ id: string; name: string; description: string }>;
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
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
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
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton-line h-6 w-36 rounded-lg" />)}
        </div>
      </div>
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
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.2), rgba(14,165,233,0.08))", border: "1px solid rgba(14,165,233,0.2)" }}>
          <ServerCog size={20} style={{ color: "#0EA5E9" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">MCP Servers</h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Connected servers and dynamically discovered tools.</p>
        </div>
      </div>

      {loading ? <McpSkeleton /> : (
        <>
          {servers.map((server) => (
            <div key={server.id} className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File size={18} style={{ color: server.status === "CONNECTED" ? "#22C55E" : "#EF4444", filter: server.status === "CONNECTED" ? "drop-shadow(0 0 6px rgba(34,197,94,0.4))" : "none" }} />
                  <div>
                    <h2 className="text-base font-semibold">{server.name}</h2>
                    <p className="text-[11px] font-mono mt-0.5" style={{ color: "#475569" }}>{server.transport} · {server.command}</p>
                  </div>
                </div>
                <span className="status-badge" style={{ background: server.status === "CONNECTED" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: server.status === "CONNECTED" ? "#22C55E" : "#EF4444", border: `1px solid ${server.status === "CONNECTED" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>{server.status}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {server.tools.map((tool) => (
                  <div key={tool.id} className="rounded-xl p-3 transition-all duration-200 cursor-default hover:bg-blue-500/5 hover:border-blue-500/20" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wrench size={11} style={{ color: "#84a9e6ff" }} />
                      <code className="text-xs font-semibold" style={{ color: "#dadfe7ff" }}>{tool.name}</code>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: "#848b94ff" }}>{tool.description || "No description"}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold mb-3">All Discovered Tools ({tools.length})</h2>
            <div className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <span key={t.name} className="px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all hover:bg-blue-500/5 hover:border-blue-500/20" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#3B82F6" }} title={t.description}>
                  {t.name} <span style={{ color: "#475569" }}>({t.serverName})</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
