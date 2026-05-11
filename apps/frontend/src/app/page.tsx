"use client";
import { useState, useRef, useEffect } from "react";
import { api, type Conversation } from "@/lib/api";
import { Send, Plus, MessageSquare, Zap, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: string;
  content: string;
  toolCalls?: Array<{ toolName: string; success: boolean; policyAction: string }>;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listConversations().then((r) => setConversations(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = async (id: string) => {
    setActiveId(id);
    try {
      const r = await api.getConversation(id);
      setMessages(
        (r.data.messages ?? [])
          .filter((m) => m.role !== "TOOL")
          .map((m) => ({ role: m.role, content: m.content ?? "" }))
      );
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "USER", content: msg }]);
    setLoading(true);

    try {
      let convId = activeId;
      if (!convId) {
        const r = await api.createConversation(msg.slice(0, 60));
        convId = r.data.id;
        setActiveId(convId);
        setConversations((prev) => [r.data, ...prev]);
      }

      const r = await api.chat(convId!, msg);
      setMessages((prev) => [
        ...prev,
        { role: "ASSISTANT", content: r.data.content, toolCalls: r.data.toolCalls },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ASSISTANT", content: `Error: ${err instanceof Error ? err.message : "Unknown"}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
  };

  const policyBadge = (action: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      DENY: { bg: "rgba(239,68,68,0.15)", text: "var(--danger)" },
      REQUIRE_APPROVAL: { bg: "rgba(245,158,11,0.15)", text: "var(--warning)" },
      ALLOW: { bg: "rgba(34,197,94,0.15)", text: "var(--success)" },
    };
    const s = styles[action] || styles.ALLOW;
    return s;
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-3rem)]">
      {/* Conversation List */}
      <div
        className="w-56 shrink-0 rounded-2xl flex flex-col gap-1 overflow-y-auto"
        style={{
          background: "rgba(11, 17, 32, 0.6)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "12px",
        }}
      >
        <button
          id="btn-new-chat"
          onClick={newChat}
          className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 mb-2 transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #2563EB, #3B82F6)",
            color: "#fff",
            boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
          }}
        >
          <Plus size={14} />
          New Chat
        </button>
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => loadConversation(c.id)}
            className="text-left px-3 py-2 rounded-xl text-xs truncate transition-all duration-200"
            style={{
              background: activeId === c.id ? "rgba(59,130,246,0.1)" : "transparent",
              color: activeId === c.id ? "var(--text-primary)" : "var(--text-muted)",
              border: activeId === c.id ? "1px solid rgba(59,130,246,0.2)" : "1px solid transparent",
            }}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={12} style={{ opacity: 0.5 }} />
              <span className="truncate">{c.title}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-card flex flex-col" style={{ borderRadius: 20 }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-5">
                <div
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center animate-float"
                  style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(124,58,237,0.15))",
                    border: "1px solid rgba(59,130,246,0.2)",
                    boxShadow: "0 0 40px rgba(59,130,246,0.15)",
                  }}
                >
                  <Zap size={28} style={{ color: "var(--accent-blue)" }} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                    Guarded AI Agent
                  </h2>
                  <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
                    Send a message to start a conversation
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                  {["List workspace files", "What tools are available?", "Read a file"].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "var(--text-secondary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(59,130,246,0.1)";
                        e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      }}
                    >
                      <Sparkles size={10} className="inline mr-1.5" style={{ color: "var(--accent-blue)" }} />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[72%] rounded-2xl px-4 py-3 text-sm"
                  style={{
                    background: m.role === "USER"
                      ? "linear-gradient(135deg, #2563EB, #3B82F6)"
                      : "rgba(255,255,255,0.04)",
                    color: m.role === "USER" ? "#fff" : "var(--text-primary)",
                    border: m.role === "USER" ? "none" : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: m.role === "USER" ? "0 4px 16px rgba(59,130,246,0.25)" : "none",
                  }}
                >
                  <pre className="whitespace-pre-wrap font-[inherit] leading-relaxed">{m.content}</pre>
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-2.5 pt-2.5 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      {m.toolCalls.map((tc, j) => {
                        const badge = policyBadge(tc.policyAction);
                        return (
                          <div key={j} className="flex items-center gap-2 text-[11px]">
                            <span>{tc.policyAction === "DENY" ? "🚫" : tc.policyAction === "REQUIRE_APPROVAL" ? "⏳" : tc.success ? "✅" : "❌"}</span>
                            <code className="font-mono opacity-80">{tc.toolName}</code>
                            <span
                              className="status-badge"
                              style={{ background: badge.bg, color: badge.text }}
                            >
                              {tc.policyAction}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div
                className="rounded-2xl px-4 py-3 text-sm animate-pulse-glow"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)" }}
              >
                <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  Thinking...
                </div>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex gap-3 items-center">
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask the AI agent..."
              disabled={loading}
              className="premium-input flex-1"
              style={{ borderRadius: 14, padding: "12px 18px" }}
            />
            <button
              id="btn-send"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="p-3 rounded-xl transition-all duration-300 disabled:opacity-30"
              style={{
                background: "linear-gradient(135deg, #2563EB, #3B82F6)",
                color: "#fff",
                boxShadow: input.trim() ? "0 4px 16px rgba(59,130,246,0.3)" : "none",
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
