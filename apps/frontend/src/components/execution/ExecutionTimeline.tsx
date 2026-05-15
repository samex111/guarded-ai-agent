"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ExecutionRecord } from "@/components/execution/execution-types";
import { ExecutionItemRow } from "@/components/execution/ExecutionItemRow";

interface ExecutionTimelineProps {
  executions: ExecutionRecord[];
  streaming?: boolean;
  /** When false and has executions, timeline can start collapsed */
  defaultCollapsed?: boolean;
  /** Auto-collapse after streaming ends */
  autoCollapseWhenDone?: boolean;
}

export function ExecutionTimeline({
  executions,
  streaming = false,
  defaultCollapsed = false,
  autoCollapseWhenDone = true,
}: ExecutionTimelineProps) {
  const [expanded, setExpanded] = useState(() => Boolean(streaming) || !defaultCollapsed);

  useEffect(() => {
    if (autoCollapseWhenDone && !streaming && executions.length > 0) {
      const t = window.setTimeout(() => setExpanded(false), 400);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [streaming, autoCollapseWhenDone]);

  useEffect(() => {
    if (streaming) setExpanded(true);
  }, [streaming]);

  if (executions.length === 0) return null;

  const summary = executions.length === 1 ? "1 step" : `${executions.length} steps`;

  return (
    <div
      style={{
        marginTop:    8,
        borderRadius: "var(--radius-md)",
        overflow:     "hidden",
        background:   "rgba(255,255,255,0.02)",
        border:       "1px solid var(--border-primary)",
      }}
    >
      {/* Toggle row */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        style={{
          display:     "flex",
          width:       "100%",
          alignItems:  "center",
          gap:         8,
          padding:     "6px 12px",
          textAlign:   "left",
          fontSize:    "var(--text-xs)",
          cursor:      "pointer",
          background:  "transparent",
          color:       "var(--text-subtle)",
          border:      "none",
          transition:  "background var(--transition-fast)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {expanded
          ? <ChevronDown  size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
          : <ChevronRight size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
        }
        <span style={{ fontWeight: "var(--font-medium)", color: "var(--text-muted)" }}>
          {streaming ? "In progress" : "Run details"}
        </span>
        <span style={{ opacity: 0.5 }}>· {summary}</span>
      </button>

      {expanded ? (
        <div
          style={{
            padding:          "0 12px 8px",
            maxHeight:        240,
            overflowY:        "auto",
            overscrollBehavior: "contain",
          }}
        >
          {executions.map((ex) => (
            <ExecutionItemRow key={ex.id} item={ex} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
