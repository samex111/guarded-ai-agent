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

  const summary =
    executions.length === 1
      ? "1 step"
      : `${executions.length} steps`;

  return (
    <div
      className="mt-2 rounded-xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors hover:bg-white/[0.04]"
        style={{ color: "#94A3B8" }}
      >
        {expanded ? <ChevronDown size={14} className="shrink-0 opacity-70" /> : <ChevronRight size={14} className="shrink-0 opacity-70" />}
        <span className="font-medium" style={{ color: "#CBD5E1" }}>
          {streaming ? "In progress" : "Run details"}
        </span>
        <span className="opacity-70">· {summary}</span>
      </button>
      {expanded ? (
        <div className="px-3 pb-2 pt-0 max-h-64 overflow-y-auto overscroll-contain">
          {executions.map((ex) => (
            <ExecutionItemRow key={ex.id} item={ex} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
