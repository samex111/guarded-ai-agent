"use client";

import type { ExecutionRecord } from "@/components/execution/execution-types";
import { kindIcon } from "@/lib/execution-humanize";

function Chip({ toolName, serverLabel }: { toolName: string; serverLabel?: string }) {
  return (
    <div
      className="animate-execution-in"
      style={{
        display:        "inline-flex",
        maxWidth:       "100%",
        flexDirection:  "column",
        gap:            2,
        borderRadius:   "var(--radius-sm)",
        padding:        "5px 10px",
        textAlign:      "left",
        background:     "var(--accent-soft)",
        border:         "1px solid rgba(214,235,253,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span style={{ flexShrink: 0, fontSize: 11 }} aria-hidden>⚡</span>
        <span
          style={{
            fontSize:     "var(--text-xs)",
            fontWeight:   "var(--font-medium)",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
            color:        "var(--text-secondary)",
            fontFamily:   "var(--font-mono)",
          }}
        >
          {toolName}
        </span>
      </div>
      {serverLabel ? (
        <span
          style={{
            fontSize:     "10px",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
            paddingLeft:  18,
            color:        "var(--text-disabled)",
          }}
        >
          {serverLabel}
        </span>
      ) : null}
    </div>
  );
}

export function ExecutionItemRow({ item }: { item: ExecutionRecord }) {
  const icon =
    item.kind === "tool" && item.toolName && item.serverLabel
      ? null
      : (
          <span
            style={{ flexShrink: 0, width: 18, textAlign: "center", fontSize: 12 }}
            aria-hidden
          >
            {item.kind === "approval" && item.status === "done"
              ? "✅"
              : item.kind === "approval" && item.status === "error"
                ? "❌"
                : kindIcon(item.kind)}
          </span>
        );

  return (
    <div
      className="animate-execution-in"
      style={{
        display:     "flex",
        gap:         8,
        padding:     "5px 0",
        borderBottom: "1px solid var(--border-primary)",
        alignItems:  "flex-start",
      }}
      data-status={item.status}
    >
      {item.kind === "tool" && item.toolName && item.serverLabel ? (
        <div style={{ display: "flex", gap: 8, minWidth: 0, flex: 1, alignItems: "flex-start" }}>
          <Chip toolName={item.toolName} serverLabel={item.serverLabel} />
        </div>
      ) : (
        <>
          {icon}
          <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <p style={{ fontSize: "var(--text-xs)", lineHeight: 1.5, color: "var(--text-muted)" }}>
              {item.title}
            </p>
            {item.subtitle ? (
              <p
                style={{
                  fontSize:   "11px",
                  lineHeight: 1.4,
                  overflow:   "hidden",
                  display:    "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  color:      "var(--text-subtle)",
                }}
              >
                {item.subtitle}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
