"use client";

import { useState, useEffect } from "react";
import { api, type McpTool } from "@/lib/api";
import { File, ServerCog, Wrench, ChevronDown, ChevronUp, FileCode2, BadgeDollarSign, FolderTree, BrainCircuit, ChevronRight } from "lucide-react";

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
  <div
    className="space-y-8 max-w-7xl mx-auto pb-10"
    style={{
      background: "#000000",
      fontFamily: "Inter, sans-serif",
    }}
  >
    {/* HEADER */}
    <div className="flex items-start gap-4">
      <div
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(42deg, rgb(20, 21, 23), rgb(25, 27, 30)), linear-gradient(42deg, rgba(24, 25, 28, 0.88) 45%, rgba(215, 239, 248, 0.28))",

          boxShadow:
            "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(176, 199, 217, 0.145) 0px 0px 0px 1px",

          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(rgba(80, 80, 80, 0.15) 0%, rgba(0, 0, 0, 0) 70%)",
          }}
        />

        <ServerCog
          size={22}
          style={{
            color: "#FFFFFF",
          }}
        />
      </div>

      <div>
        <h1
          style={{
            color: "#F8F8F8",
            fontSize: "42px",
            fontWeight: 600,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            fontFamily: "Inter, sans-serif",
          }}
        >
          MCP Servers
        </h1>

        <p
          className="mt-2"
          style={{
            color: "#A1A4A5",
            fontSize: "15px",
            lineHeight: 1.6,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Connected servers and dynamically discovered tools.
        </p>
      </div>
    </div>

    {loading ? (
      <McpSkeleton />
    ) : (
      <>
        {servers.map((server) => (
          <div
            key={server.id}
            className="relative overflow-hidden p-6"
            style={{
              borderRadius: "24px",

              background: `
                linear-gradient(
                  42deg,
                  rgb(20, 21, 23),
                  rgb(25, 27, 30)
                ),
                linear-gradient(
                  42deg,
                  rgba(24, 25, 28, 0.88) 45%,
                  rgba(215, 239, 248, 0.12)
                )
              `,

              boxShadow:
                "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(176, 199, 217, 0.145) 0px 0px 0px 1px",

              border: "1px solid rgba(255,255,255,0.04)",

              backdropFilter: "blur(12px)",
            }}
          >
            {/* TOP FADE */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(rgba(80, 80, 80, 0.15) 0%, rgba(0, 0, 0, 0) 70%)",
              }}
            />

            {/* HEADER */}
            <div className="relative z-10 flex items-start justify-between gap-5 flex-wrap">
              <div className="flex items-start gap-4 min-w-0">
                {/* SERVER ICON */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",

                    boxShadow:
                      "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(176, 199, 217, 0.145) 0px 0px 0px 1px",

                    border: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  {server.name.toLowerCase().includes("filesystem") ? (
                    <FolderTree
                      size={19}
                      style={{
                        color: "#D6EBFD",
                      }}
                    />
                  ) : server.name.toLowerCase().includes("lead") ? (
                    <BadgeDollarSign
                      size={19}
                      style={{
                        color: "#D6EBFD",
                      }}
                    />
                  ) : server.name.toLowerCase().includes("context") ? (
                    <BrainCircuit
                      size={19}
                      style={{
                        color: "#D6EBFD",
                      }}
                    />
                  ) : (
                    <ServerCog
                      size={19}
                      style={{
                        color: "#D6EBFD",
                      }}
                    />
                  )}
                </div>

                {/* TITLE */}
                <div className="min-w-0">
                  <h2
                    style={{
                      color: "#F8F8F8",
                      fontSize: "34px",
                      fontWeight: 600,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {server.name}
                  </h2>

                  <div className="flex items-center gap-2 mt-3">
                    <span
                      style={{
                        color: "#6C6C6C",
                        fontSize: "12px",
                        fontFamily: "commitMono, monospace",
                        letterSpacing: "0.04em",
                      }}
                    >
                      STDIO
                    </span>

                    <span
                      style={{
                        color: "#464A4D",
                        fontSize: "10px",
                      }}
                    >
                      •
                    </span>

                    <span
                      style={{
                        color: "#A0A0A0",
                        fontSize: "12px",
                        fontFamily: "commitMono, monospace",
                      }}
                    >
                      npx
                    </span>
                  </div>
                </div>
              </div>

              {/* STATUS */}
              <div
                className="px-4 py-2 rounded-full flex items-center gap-2"
                style={{
                  background:
                    server.status === "CONNECTED"
                      ? "rgba(68,255,164,0.06)"
                      : "rgba(239,68,68,0.08)",

                  boxShadow:
                    "rgba(176, 199, 217, 0.145) 0px 0px 0px 1px",

                  border:
                    server.status === "CONNECTED"
                      ? "1px solid rgba(68,255,164,0.08)"
                      : "1px solid rgba(239,68,68,0.12)",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      server.status === "CONNECTED"
                        ? "#D6EBFD"
                        : "#EF4444",
                  }}
                />

                <span
                  style={{
                    color:
                      server.status === "CONNECTED"
                        ? "#D6EBFD"
                        : "#EF4444",

                    fontSize: "13px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {server.status}
                </span>
              </div>
            </div>

            {/* TOOL GRID */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-8">
              {server.tools.map((tool) => (
                <div
                  key={tool.id}
                  className="group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-[2px]"
                  style={{
                    borderRadius: "16px",

                    background: `
                      linear-gradient(
                        180deg,
                        rgba(255,255,255,0.02),
                        rgba(255,255,255,0.01)
                      )
                    `,

                    boxShadow:
                      "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(176, 199, 217, 0.145) 0px 0px 0px 1px",

                    border: "1px solid rgba(255,255,255,0.03)",

                    minHeight: "150px",
                  }}
                >
                  {/* TOP LIGHT */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        "linear-gradient(rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 70%)",
                    }}
                  />

                  <div className="relative z-10 flex items-start gap-4">
                    {/* TOOL ICON */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",

                        boxShadow:
                          "rgba(176, 199, 217, 0.145) 0px 0px 0px 1px",
                      }}
                    >
                      <Wrench
                        size={14}
                        style={{
                          color: "#D6EBFD",
                        }}
                      />
                    </div>

                    {/* CONTENT */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className="truncate"
                          style={{
                            color: "#F0F0F0",
                            fontSize: "16px",
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {tool.name}
                        </h3>

                        <ChevronRight
                          size={16}
                          style={{
                            color: "#6C6C6C",
                          }}
                        />
                      </div>

                      <p
                        style={{
                          color: "#A1A4A5",
                          fontSize: "13px",
                          lineHeight: 1.7,
                          marginTop: "10px",

                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",

                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {tool.description}
                      </p>

                      {tool.description?.length > 120 && (
                        <button
                          className="mt-4 transition-opacity hover:opacity-100"
                          style={{
                            color: "#D6EBFD",
                            fontSize: "12px",
                            fontWeight: 500,
                            opacity: 0.85,
                          }}
                        >
                          Read more
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    )}
  </div>
);
}
