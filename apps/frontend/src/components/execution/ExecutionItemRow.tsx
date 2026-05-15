"use client";

import type { ExecutionRecord } from "@/components/execution/execution-types";

import {
  Brain,
  CheckCircle2,
  XCircle,
  Shield,
  Wrench,
  LoaderCircle,
} from "lucide-react";

function Chip({
  toolName,
  serverLabel,
}: {
  toolName: string;
  serverLabel?: string;
}) {
  return (
    <div
      className="animate-execution-in"
      style={{
        display: "inline-flex",
        maxWidth: "100%",
        flexDirection: "column",
        gap: 4,

        borderRadius: 12,

        padding: "8px 12px",

        textAlign: "left",

        background: "rgba(255,255,255,0.04)",

        border: "1px solid rgba(255,255,255,0.06)",

        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,

            borderRadius: 8,

            background: "rgba(59,130,246,0.12)",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            flexShrink: 0,
          }}
        >
          <Wrench size={13} color="#60a5fa" />
        </div>

        <span
          style={{
            fontSize: 13,
            fontWeight: 500,

            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",

            color: "var(--text-primary)",

            fontFamily: "var(--font-mono)",
          }}
        >
          {toolName}
        </span>
      </div>

      {serverLabel ? (
        <span
          style={{
            fontSize: 11,

            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",

            paddingLeft: 32,

            color: "#71717a",
          }}
        >
          {serverLabel}
        </span>
      ) : null}
    </div>
  );
}

export function ExecutionItemRow({
  item,
}: {
  item: ExecutionRecord;
}) {
  const renderIcon = () => {
    if (item.status === "running") {
      return (
        <LoaderCircle
          size={15}
          className="animate-spin"
          color="#8b5cf6"
        />
      );
    }

    if (item.status === "done") {
      return (
        <CheckCircle2
          size={15}
          color="#22c55e"
        />
      );
    }

    if (item.status === "error") {
      return (
        <XCircle
          size={15}
          color="#ef4444"
        />
      );
    }

    switch (item.kind) {
      case "approval":
        return (
          <Shield
            size={15}
            color="#f59e0b"
          />
        );

      case "tool":
        return (
          <Wrench
            size={15}
            color="#60a5fa"
          />
        );

      default:
        return (
          <Brain
            size={15}
            color="#94a3b8"
          />
        );
    }
  };

  return (
    <div
      className="animate-execution-in"
      style={{
        display: "flex",

        gap: 12,

        padding: "12px 0",

        borderBottom:
          "1px solid rgba(255,255,255,0.05)",

        alignItems: "flex-start",
      }}
      data-status={item.status}
    >
      {item.kind === "tool" &&
      item.toolName &&
      item.serverLabel ? (
        <div
          style={{
            display: "flex",
            gap: 12,
            minWidth: 0,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          <Chip
            toolName={item.toolName}
            serverLabel={item.serverLabel}
          />
        </div>
      ) : (
        <>
          <div
            style={{
              width: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              flexShrink: 0,

              marginTop: 2,
            }}
          >
            {renderIcon()}
          </div>

          <div
            style={{
              minWidth: 0,
              flex: 1,

              display: "flex",
              flexDirection: "column",

              gap: 4,
            }}
          >
            <p
              style={{
                fontSize: 13,

                lineHeight: 1.5,

                color: "var(--text-primary)",

                fontWeight: 500,
              }}
            >
              {item.title}
            </p>

            {item.subtitle ? (
              <p
                style={{
                  fontSize: 12,

                  lineHeight: 1.5,

                  overflow: "hidden",

                  display: "-webkit-box",

                  WebkitLineClamp: 2,

                  WebkitBoxOrient: "vertical",

                  color: "#71717a",
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