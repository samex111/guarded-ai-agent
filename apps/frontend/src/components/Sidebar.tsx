"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ScrollText,
  ServerCog,
  Settings,
  Zap,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/",          label: "Chat",        icon: MessageSquare, id: "nav-chat" },
  { href: "/leads",     label: "Leads",       icon: Users,         id: "nav-leads" },
  { href: "/policies",  label: "Policies",    icon: ShieldCheck,   id: "nav-policies" },
  { href: "/approvals", label: "Approvals",   icon: CheckCircle2,  id: "nav-approvals" },
  { href: "/audit",     label: "Audit Logs",  icon: ScrollText,    id: "nav-audit" },
  { href: "/mcp",       label: "MCP Servers", icon: ServerCog,     id: "nav-mcp" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  return (
    <aside
      className="fixed left-3 top-3 bottom-3 z-50 flex flex-col"
      style={{
        width: "calc(var(--sidebar-width) - 12px)",
        background: "linear-gradient(180deg, rgba(18,19,21,0.92), rgba(14,15,17,0.92))",
        backdropFilter: "blur(24px)",
        border: "1px solid var(--border-secondary)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: "20px 20px 16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {/* Icon box — matches page header icon style */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(42deg, rgb(20,21,23), rgb(30,32,36))",
            border: "1px solid var(--border-secondary)",
            boxShadow: "var(--shadow-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 70%)",
            }}
          />
          <Zap size={14} color="var(--accent-primary)" style={{ position: "relative" }} />
        </div>

        <div>
          <span
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-semibold)",
              letterSpacing: "var(--tracking-normal)",
              color: "var(--text-primary)",
            }}
          >
            Guarded
          </span>
          <span
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-regular)",
              marginLeft: 4,
              color: "var(--text-subtle)",
            }}
          >
            Agent
          </span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div
        style={{
          height: 1,
          background: "var(--border-primary)",
          margin: "0 16px 8px",
        }}
      />

      {/* ── Section Label ── */}
      <div style={{ padding: "4px 20px 8px" }}>
        <span
          style={{
            fontSize: "10px",
            fontWeight: "var(--font-semibold)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-disabled)",
          }}
        >
          Navigation
        </span>
      </div>

      {/* ── Nav Items ── */}
      <nav
        style={{
          flex: 1,
          padding: "0 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {navItems.map((item) => {
          const isActive  = pathname === item.href;
          const isLoading = isPending && pendingHref === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={item.id}
              onClick={() => {
                if (!isActive) {
                  setPendingHref(item.href);
                  startTransition(() => {});
                }
              }}
              className={`sidebar-item ${isActive ? "active" : ""}`}
              style={{ opacity: isLoading ? 0.6 : 1 }}
            >
              <Icon
                size={16}
                style={{
                  color:      isActive ? "var(--accent-primary)" : "var(--text-subtle)",
                  flexShrink: 0,
                  transition: "color var(--transition-fast)",
                }}
              />
              <span style={{ flex: 1 }}>{item.label}</span>

              {/* Active indicator dot */}
              {isActive && (
                <div
                  style={{
                    width:        6,
                    height:       6,
                    borderRadius: "var(--radius-full)",
                    background:   "var(--accent-primary)",
                    opacity:      0.7,
                    flexShrink:   0,
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom Section ── */}
      <div style={{ padding: "0 10px 14px" }}>
        <div
          style={{
            height: 1,
            background: "var(--border-primary)",
            margin: "0 2px 8px",
          }}
        />
        <div
          className="sidebar-item"
          style={{ fontSize: "var(--text-sm)", cursor: "default" }}
        >
          <Settings size={15} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
          <span>Settings</span>
        </div>
      </div>
    </aside>
  );
}
