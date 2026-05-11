"use client";
import { useState, useEffect } from "react";
import { api, type McpTool } from "@/lib/api";

interface McpServer {
  id: string;
  name: string;
  transport: string;
  command: string | null;
  status: string;
  enabled: boolean;
  lastConnectedAt: string | null;
  tools: Array<{ id: string; name: string; description: string }>;
}

export default function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);

  useEffect(() => {
    api.listMcpServers().then((r) => setServers(r.data as McpServer[])).catch(() => {});
    api.listMcpTools().then((r) => setTools(r.data)).catch(() => {});
  }, []);

  const statusColor = (status: string) =>
    status === "CONNECTED" ? "var(--success)" : status === "ERROR" ? "var(--danger)" : "var(--text-secondary)";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">🔧 MCP Servers</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Connected MCP servers and dynamically discovered tools.
        </p>
      </div>

      {/* Server Cards */}
      <div className="grid gap-4">
        {servers.map((server) => (
          <div
            key={server.id}
            className="rounded-xl border p-5 animate-fade-in"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xl">📡</span>
              <div>
                <h2 className="font-semibold text-lg">{server.name}</h2>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Transport: {server.transport} · Command: <code>{server.command}</code>
                </p>
              </div>
              <span
                className="ml-auto px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: statusColor(server.status), color: "#000" }}
              >
                {server.status}
              </span>
            </div>

            {/* Tools */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {server.tools.map((tool) => (
                <div
                  key={tool.id}
                  className="rounded-lg p-3 border transition-all hover:scale-[1.02]"
                  style={{ background: "var(--bg-hover)", borderColor: "var(--border)" }}
                >
                  <p className="font-mono text-sm font-medium" style={{ color: "var(--accent)" }}>{tool.name}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    {tool.description || "No description"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* All Tools Summary */}
      <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <h2 className="font-semibold mb-3">All Discovered Tools ({tools.length})</h2>
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => (
            <span
              key={tool.name}
              className="px-3 py-1.5 rounded-lg text-xs font-mono border"
              style={{ background: "var(--bg-hover)", borderColor: "var(--border)", color: "var(--accent)" }}
              title={tool.description}
            >
              {tool.name}
              <span className="ml-1.5 opacity-50">({tool.serverName})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
