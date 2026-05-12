import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Guarded AI Agent — Dashboard",
  description: "Policy management, approval workflows, and conversation tracing for the Guarded AI Agent platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen" style={{ background: "#000000ff", color: "#F8FAFC" }}>
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div
            className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full animate-float"
            style={{
              background: "radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(124,58,237,0.03) 0%, transparent 70%)",
              filter: "blur(80px)",
              animation: "float 8s ease-in-out infinite reverse",
            }}
          />
        </div>

        <Sidebar />

        {/* Main content area — offset for sidebar */}
        <main className="ml-[240px] p-6 bg-black arelative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
