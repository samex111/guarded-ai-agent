"use client";
import { useState, useEffect } from "react";
import { api, type McpTool } from "@/lib/api";
import { ServerCog, Wifi, Wrench } from "lucide-react";
import { motion } from "framer-motion";

interface McpServer {
  id: string; name: string; transport: string; command: string | null;
  status: string; enabled: boolean; tools: Array<{ id: string; name: string; description: string }>;
}

export default function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);

  useEffect(() => {
    api.listMcpServers().then((r) => setServers(r.data as McpServer[])).catch(() => {});
    api.listMcpTools().then((r) => setTools(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.2), rgba(14,165,233,0.08))", border: "1px solid rgba(14,165,233,0.2)" }}>
          <ServerCog size={20} style={{ color: "var(--info)" }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">MCP Servers</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Connected servers and dynamically discovered tools.</p>
        </div>
      </div>

      {servers.map((server, i) => (
        <motion.div key={server.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi size={18} style={{ color: server.status === "CONNECTED" ? "var(--success)" : "var(--danger)", filter: server.status === "CONNECTED" ? "drop-shadow(0 0 6px rgba(34,197,94,0.4))" : "none" }} />
              <div>
                <h2 className="text-base font-semibold">{server.name}</h2>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-disabled)" }}>{server.transport} · {server.command}</p>
              </div>
            </div>
            <span className="status-badge" style={{
              background: server.status === "CONNECTED" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: server.status === "CONNECTED" ? "var(--success)" : "var(--danger)",
              border: `1px solid ${server.status === "CONNECTED" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>{server.status}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {server.tools.map((tool, j) => (
              <motion.div key={tool.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: j * 0.05 }}
                className="rounded-xl p-3 transition-all duration-200 cursor-default group"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.06)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Wrench size={11} style={{ color: "var(--accent-blue)" }} />
                  <code className="text-xs font-semibold" style={{ color: "var(--accent-blue)" }}>{tool.name}</code>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-disabled)" }}>{tool.description || "No description"}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-3">All Discovered Tools ({tools.length})</h2>
        <div className="flex flex-wrap gap-2">
          {tools.map((t) => (
            <span key={t.name} className="px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--accent-blue)" }} title={t.description}>
              {t.name} <span style={{ color: "var(--text-disabled)" }}>({t.serverName})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
