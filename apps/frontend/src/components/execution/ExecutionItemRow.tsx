"use client";

import type { ExecutionRecord } from "@/components/execution/execution-types";
import { kindIcon } from "@/lib/execution-humanize";

function Chip({ toolName, serverLabel }: { toolName: string; serverLabel?: string }) {
  return (
    <div
      className="inline-flex max-w-full flex-col gap-0.5 rounded-lg px-2.5 py-1.5 text-left animate-execution-in"
      style={{
        background: "rgba(59, 130, 246, 0.08)",
        border: "1px solid rgba(59, 130, 246, 0.2)",
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="shrink-0 text-[11px]" aria-hidden>
          ⚡
        </span>
        <span className="text-[11px] font-medium truncate" style={{ color: "#E2E8F0" }}>
          {toolName}
        </span>
      </div>
      {serverLabel ? (
        <span className="text-[10px] truncate pl-5" style={{ color: "#64748B" }}>
          {serverLabel}
        </span>
      ) : null}
    </div>
  );
}

export function ExecutionItemRow({ item }: { item: ExecutionRecord }) {
  const icon = item.kind === "tool" && item.toolName && item.serverLabel
    ? null
    : (
        <span className="shrink-0 w-5 text-center text-[12px]" aria-hidden>
          {item.kind === "approval" && item.status === "done"
            ? "✅"
            : item.kind === "approval" && item.status === "error"
              ? "❌"
              : kindIcon(item.kind)}
        </span>
      );

  return (
    <div
      className="flex gap-2 py-1.5 animate-execution-in border-b border-white/[0.04] last:border-0"
      data-status={item.status}
    >
      {item.kind === "tool" && item.toolName && item.serverLabel ? (
        <div className="flex gap-2 min-w-0 flex-1 items-start">
          <Chip toolName={item.toolName} serverLabel={item.serverLabel} />
        </div>
      ) : (
        <>
          {icon}
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[12px] leading-snug" style={{ color: "#E2E8F0" }}>
              {item.title}
            </p>
            {item.subtitle ? (
              <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "#64748B" }}>
                {item.subtitle}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
