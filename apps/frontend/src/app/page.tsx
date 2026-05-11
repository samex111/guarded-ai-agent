"use client";
import { useState, useRef, useEffect } from "react";
import { api, type Conversation } from "@/lib/api";

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
    } catch { setMessages([]); }
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
        {
          role: "ASSISTANT",
          content: r.data.content,
          toolCalls: r.data.toolCalls,
        },
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

  return (
    <div className="flex gap-4 h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <div
        className="w-64 shrink-0 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <button
          id="btn-new-chat"
          onClick={newChat}
          className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          + New Chat
        </button>
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => loadConversation(c.id)}
            className="text-left px-3 py-2 rounded-lg text-sm truncate transition-all"
            style={{
              background: activeId === c.id ? "var(--bg-hover)" : "transparent",
              color: activeId === c.id ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div
        className="flex-1 rounded-xl border flex flex-col"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
              <div className="text-center">
                <p className="text-4xl mb-3">⚡</p>
                <p className="text-lg font-semibold">Guarded AI Agent</p>
                <p className="text-sm mt-1">Send a message to start a conversation</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div
                className="max-w-[75%] rounded-xl px-4 py-3 text-sm"
                style={{
                  background: m.role === "USER" ? "var(--accent)" : "var(--bg-hover)",
                  color: m.role === "USER" ? "#fff" : "var(--text-primary)",
                }}
              >
                <pre className="whitespace-pre-wrap font-[inherit]">{m.content}</pre>
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    {m.toolCalls.map((tc, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs opacity-80">
                        <span>{tc.policyAction === "DENY" ? "🚫" : tc.policyAction === "REQUIRE_APPROVAL" ? "⏳" : tc.success ? "✅" : "❌"}</span>
                        <span className="font-mono">{tc.toolName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{
                          background: tc.policyAction === "DENY" ? "var(--danger)" :
                            tc.policyAction === "REQUIRE_APPROVAL" ? "var(--warning)" : "var(--success)",
                          color: "#000",
                        }}>
                          {tc.policyAction}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="rounded-xl px-4 py-3 text-sm animate-pulse-glow" style={{ background: "var(--bg-hover)" }}>
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex gap-2">
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              disabled={loading}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none border transition-all"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              id="btn-send"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
