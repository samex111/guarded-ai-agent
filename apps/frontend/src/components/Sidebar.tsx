"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ScrollText,
  ServerCog,
  LayoutDashboard,
  Settings,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Chat", icon: MessageSquare, id: "nav-chat" },
  { href: "/policies", label: "Policies", icon: ShieldCheck, id: "nav-policies" },
  { href: "/approvals", label: "Approvals", icon: CheckCircle2, id: "nav-approvals" },
  { href: "/audit", label: "Audit Logs", icon: ScrollText, id: "nav-audit" },
  { href: "/mcp", label: "MCP Servers", icon: ServerCog, id: "nav-mcp" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-3 top-3 bottom-3 w-[220px] z-50 flex flex-col rounded-2xl"
      style={{
        background: "linear-gradient(180deg, rgba(11, 17, 32, 0.95), rgba(5, 8, 22, 0.98))",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #2563EB, #3B82F6)",
            boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
          }}
        >
          <Zap size={16} color="#fff" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Guarded
          </span>
          <span className="text-sm font-light ml-1" style={{ color: "var(--text-muted)" }}>
            Agent
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-2" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* Label */}
      <div className="px-5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
          Navigation
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              id={item.id}
              className={`sidebar-item ${isActive ? "active" : ""}`}
            >
              <Icon
                size={17}
                style={{
                  color: isActive ? "var(--accent-blue)" : "var(--text-muted)",
                  filter: isActive ? "drop-shadow(0 0 6px rgba(59,130,246,0.4))" : "none",
                  transition: "all 0.25s ease",
                }}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 pb-4 space-y-1">
        <div className="mx-1 mb-2" style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
        <div className="sidebar-item" style={{ fontSize: 12 }}>
          <Settings size={15} style={{ color: "var(--text-muted)" }} />
          <span>Settings</span>
        </div>
        <div
          className="mx-1 mt-3 px-3 py-2.5 rounded-xl flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(59, 130, 246, 0.06))",
            border: "1px solid rgba(59, 130, 246, 0.15)",
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--success)", boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)" }}
          />
          <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
            System Online
          </span>
        </div>
      </div>
    </aside>
  );
}
