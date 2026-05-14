"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api, type Conversation } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useChatExecutionSocket } from "@/hooks/useChatExecutionSocket";
import { ExecutionTimeline } from "@/components/execution/ExecutionTimeline";
import type { ExecutionRecord } from "@/components/execution/execution-types";
import { Send, Plus, MessageSquare, Sparkles } from "lucide-react";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  executions?: ExecutionRecord[];
  streaming?: boolean;
  executionTimelineCollapsed?: boolean;
  toolCalls?: Array<{ toolName: string; success: boolean; policyAction: string }>;
}

function ThinkingInline() {
  return (
    <div className="flex items-center gap-2.5 py-1 text-[12px]" style={{ color: "#64748B" }}>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-sky-400/90 animate-thinking-dot"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
      <span>Thinking…</span>
    </div>
  );
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [socketConvId, setSocketConvId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    api
      .listConversations()
      .then((r) => setConversations(r.data))
      .catch(() => { })
      .finally(() => setLoadingConvs(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const appendExecution = useCallback((row: ExecutionRecord) => {
    const aid = streamingAssistantIdRef.current;
    if (!aid) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === aid && m.role === "ASSISTANT"
          ? { ...m, executions: [...(m.executions ?? []), row] }
          : m,
      ),
    );
  }, []);

  useChatExecutionSocket(
    socketConvId,
    Boolean(socketConvId && loading),
    Boolean(socketConvId && loading),
    appendExecution,
  );

  const loadConversation = useCallback(async (id: string) => {
    setActiveId(id);
    try {
      const r = await api.getConversation(id);
      setMessages(
        (r.data.messages ?? [])
          .filter((m) => m.role !== "TOOL")
          .map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content ?? "",
            executions: [],
            executionTimelineCollapsed: true,
          })),
      );
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    const s = getSocket();
    const onSync = (p: { conversationId: string }) => {
      if (activeId && p.conversationId === activeId) {
        void loadConversation(activeId);
      }
    };
    s.on("conversation:sync", onSync);
    return () => {
      s.off("conversation:sync", onSync);
    };
  }, [activeId, loadConversation]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "USER", content: msg }]);
    setLoading(true);

    let convId = activeId;
    try {
      if (!convId) {
        const r = await api.createConversation(msg.slice(0, 60));
        convId = r.data.id;
        setActiveId(convId);
        setConversations((prev) => [r.data, ...prev]);
      }

      const assistantId = crypto.randomUUID();
      streamingAssistantIdRef.current = assistantId;
      setSocketConvId(convId);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "ASSISTANT",
          content: "",
          executions: [],
          streaming: true,
        },
      ]);

      const r = await api.chat(convId, msg);

      setMessages((prev) => {
        const withCollapsed = prev.map((m) =>
          m.role === "ASSISTANT" &&
            m.id !== assistantId &&
            (m.executions?.length ?? 0) > 0
            ? { ...m, executionTimelineCollapsed: true }
            : m,
        );
        return withCollapsed.map((m) =>
          m.id === assistantId
            ? {
              ...m,
              content: r.data.content,
              toolCalls: r.data.toolCalls,
              streaming: false,
            }
            : m,
        );
      });
    } catch (err) {
      const errText = `Something went wrong. ${err instanceof Error ? err.message : "Please try again."}`;
      const aid = streamingAssistantIdRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          aid && m.id === aid
            ? {
              ...m,
              content: errText,
              streaming: false,
              executions: [
                ...(m.executions ?? []),
                {
                  id: `err-${Date.now()}`,
                  kind: "error" as const,
                  title: "Couldn’t complete the request",
                  subtitle: err instanceof Error ? err.message.slice(0, 120) : undefined,
                  status: "error" as const,
                },
              ],
            }
            : m,
        ),
      );
    } finally {
      setLoading(false);
      setSocketConvId(null);
      streamingAssistantIdRef.current = null;
    }
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
  };

  const policyBadge = (action: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      DENY: { bg: "rgba(239,68,68,0.15)", text: "#EF4444" },
      REQUIRE_APPROVAL: { bg: "rgba(245,158,11,0.15)", text: "#F59E0B" },
      ALLOW: { bg: "rgba(34,197,94,0.15)", text: "#22C55E" },
    };
    return styles[action] || styles.ALLOW;
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-3rem)] min-h-0">
      <div
        className="w-56 shrink-0 rounded-2xl flex flex-col gap-0.5 overflow-y-auto"
        style={{
          background: "rgba(31, 32, 32, 0.6)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: 10,
        }}
      >
        <button
          id="btn-new-chat"
          onClick={newChat}
          className="w-full py-2.5 sticky top-0 z-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 mb-2"
          style={{
            background: "linear-gradient(135deg, #2563EB, #3B82F6)",
            color: "#fff",
            boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
          }}
        >
          <Plus size={14} /> New Chat
        </button>

        {loadingConvs ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-line h-8 rounded-xl mb-1" />
            ))}
          </>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => void loadConversation(c.id)}
              className="text-left px-4 flex py-4 rounded-xl text-xs truncate transition-all duration-200"
              style={{
                background: activeId === c.id ? "rgba(49, 51, 54, 0.1)" : "transparent",
                color: activeId === c.id ? "#F8FAFC" : "#64748B",
                border:
                  activeId === c.id
                    ? "1px solid rgba(237, 242, 248, 0.2)"
                    : "1px solid transparent",
              }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={12} style={{ opacity: 0.5 }} />
                <span className="truncate">{c.title}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div
          className="flex-1 glass-card flex flex-col min-h-0 overflow-hidden"
          style={{ borderRadius: 20 }}
        >
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-4"
            style={{ background: "#161617" }}
          >
            {messages.length === 0 && (
              <div className="h-full min-h-[240px] bg-transparent flex items-center justify-center">
                <div className="text-center space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Guarded AI Agent</h2>
                    <p className="text-sm mt-1.5" style={{ color: "#64748B" }}>
                      Send a message to start a conversation
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                    {["List workspace files", "What tools are available?", "Read a file"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="px-3 py-1.5 rounded-lg text-xs transition-all duration-200 hover:bg-blue-500/10 hover:border-blue-500/30"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#CBD5E1",
                        }}
                      >
                        <Sparkles size={10} className="inline mr-1.5" style={{ color: "#3B82F6" }} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"} animate-fade-in-up`}
              >
                <div
                  className="max-w-[min(72vw,640px)] w-full sm:w-auto rounded-2xl px-4 py-3 text-sm"
                  style={{
                    background:
                      m.role === "USER"
                        ? "linear-gradient(135deg, #2563EB, #3B82F6)"
                        : "rgba(255,255,255,0.04)",
                    color: m.role === "USER" ? "#fff" : "#F8FAFC",
                    border: m.role === "USER" ? "none" : "1px solid rgba(255,255,255,0.06)",
                    boxShadow:
                      m.role === "USER" ? "0 4px 16px rgba(59,130,246,0.25)" : "none",
                  }}
                >
                  {m.role === "ASSISTANT" && m.streaming && (m.executions?.length ?? 0) === 0 ? (
                    <ThinkingInline />
                  ) : null}

                  {(m.executions?.length ?? 0) > 0 ? (
                    <ExecutionTimeline
                      executions={m.executions ?? []}
                      streaming={Boolean(m.streaming)}
                      defaultCollapsed={Boolean(m.executionTimelineCollapsed)}
                      autoCollapseWhenDone={!m.streaming}
                    />
                  ) : null}

                  {m.content ? (
                    <pre
                      className={`whitespace-pre-wrap font-[inherit] leading-relaxed ${(m.executions?.length ?? 0) > 0 ? "mt-3 pt-3 border-t border-white/[0.06]" : ""
                        }`}
                    >
                      {m.content}
                    </pre>
                  ) : null}

                  {m.toolCalls && m.toolCalls.length > 0 ? (
                    <div
                      className="mt-2.5 pt-2.5 space-y-1.5 border-t border-white/[0.08]"
                      style={{ borderTopColor: m.role === "USER" ? "rgba(255,255,255,0.12)" : undefined }}
                    >
                      {m.toolCalls.map((tc, j) => {
                        const badge = policyBadge(tc.policyAction);
                        return (
                          <div key={j} className="flex items-center gap-2 text-[11px] flex-wrap">
                            <span>
                              {tc.policyAction === "DENY"
                                ? "🚫"
                                : tc.policyAction === "REQUIRE_APPROVAL"
                                  ? "⏳"
                                  : tc.success
                                    ? "✅"
                                    : "❌"}
                            </span>
                            <code className="font-mono opacity-80 truncate max-w-[200px]">{tc.toolName}</code>
                            <span
                              className="status-badge shrink-0"
                              style={{ background: badge.bg, color: badge.text }}
                            >
                              {tc.policyAction === "ALLOW" ? "Allowed" : tc.policyAction === "DENY" ? "Blocked" : "Approval"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          <div
            className="shrink-0 p-4 border-t border-white/[0.06]"
            style={{ backgroundColor: "#161617" }}
          >
            <div className="flex gap-3 items-center">
              <input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void sendMessage()}
                placeholder="Ask the AI agent…"
                disabled={loading}
                className="bg-[#161617] premium-input flex-1 min-w-0"
                style={{ borderRadius: 14, padding: "12px 18px" }}
              />
              <button
                id="btn-send"
                type="button"
                onClick={() => void sendMessage()}
                disabled={loading || !input.trim()}
                className="p-3 rounded-xl transition-all duration-300 disabled:opacity-30 shrink-0"
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
    </div>
  );
}
