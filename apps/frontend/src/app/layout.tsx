import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Guarded AI Agent — Dashboard",
  description:
    "Policy management, approval workflows, and conversation tracing for the Guarded AI Agent platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          background: "linear-gradient(42deg, rgb(20, 21, 23), rgb(25, 27, 30))",
          color: "var(--text-primary)",
          fontFamily: "var(--font-primary)",
        }}
      >
        {/* Ambient background — subtle, neutral, not cyberpunk */}
        <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
          <div
            className="absolute top-0 left-1/4 w-[700px] h-[700px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(214,235,253,0.025) 0%, transparent 70%)",
              filter: "blur(100px)",
              animation: "float 10s ease-in-out infinite",
            }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)",
              filter: "blur(80px)",
              animation: "float 14s ease-in-out infinite reverse",
            }}
          />
        </div>

        <Sidebar />

        {/* Main content area — offset for sidebar */}
        <main
          className="relative z-10 min-h-screen"
          style={{
            marginLeft: "var(--sidebar-width)",
            padding: "24px",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
