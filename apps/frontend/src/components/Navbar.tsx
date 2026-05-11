"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "💬 Chat", id: "nav-chat" },
  { href: "/policies", label: "🛡️ Policies", id: "nav-policies" },
  { href: "/approvals", label: "✅ Approvals", id: "nav-approvals" },
  { href: "/audit", label: "📋 Audit Logs", id: "nav-audit" },
  { href: "/mcp", label: "🔧 MCP Servers", id: "nav-mcp" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{
        background: "rgba(10, 10, 15, 0.85)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-1">
        <span className="font-bold text-lg mr-6" style={{ color: "var(--accent)" }}>
          ⚡ Guarded Agent
        </span>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              id={item.id}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
              style={{
                background: isActive ? "var(--bg-hover)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
