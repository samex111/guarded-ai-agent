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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "4px 0",
        fontSize: "var(--text-xs)",
        color: "var(--text-subtle)",
      }}
    >
      <span style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-thinking-dot"
            style={{
              display:      "inline-block",
              width:        6,
              height:       6,
              borderRadius: "var(--radius-full)",
              background:   "var(--accent-primary)",
              animationDelay: `${i * 160}ms`,
            }}
          />
        ))}
      </span>
      <span>Thinking…</span>
    </div>
  );
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [socketConvId, setSocketConvId]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    api
      .listConversations()
      .then((r) => setConversations(r.data))
      .catch(() => {})
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
    return () => { s.off("conversation:sync", onSync); };
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
        { id: assistantId, role: "ASSISTANT", content: "", executions: [], streaming: true },
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
            ? { ...m, content: r.data.content, toolCalls: r.data.toolCalls, streaming: false }
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
                content:   errText,
                streaming: false,
                executions: [
                  ...(m.executions ?? []),
                  {
                    id:       `err-${Date.now()}`,
                    kind:     "error" as const,
                    title:    "Couldn't complete the request",
                    subtitle: err instanceof Error ? err.message.slice(0, 120) : undefined,
                    status:   "error" as const,
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
    const styles: Record<string, { bg: string; text: string; border: string }> = {
      DENY:             { bg: "rgba(239,68,68,0.08)",   text: "#EF4444", border: "rgba(239,68,68,0.15)" },
      REQUIRE_APPROVAL: { bg: "rgba(245,158,11,0.08)",  text: "#F59E0B", border: "rgba(245,158,11,0.15)" },
      ALLOW:            { bg: "rgba(214,235,253,0.06)", text: "#D6EBFD", border: "rgba(214,235,253,0.10)" },
    };
    return styles[action] || styles.ALLOW;
  };

  return (
    <div
      style={{
        display:   "flex",
        gap:       20,
        height:    "calc(100vh - 48px)",
        minHeight: 0,
      }}
    >
      {/* ── Conversation List ── */}
      <div
  style={{
    width: 220,
    flexShrink: 0,
    borderRadius: "var(--radius-xl)",

    display: "flex",
    flexDirection: "column",

    overflowY: "auto",
    overflowX: "hidden",

    background: "var(--gradient-card)",
    border: "1px solid var(--border-primary)",
    boxShadow: "var(--shadow-card)",
    backdropFilter: "blur(16px)",

    padding: 10,
    gap: 6,

    position: "relative",
  }}
>
  {/* New Chat button */}
  <button
    id="btn-new-chat"
    onClick={newChat}
    style={{
      width: "100%",
      padding: "10px 0",

      position: "sticky",
      top: 0,
      zIndex: 20,

      borderRadius: "var(--radius-md)",

      fontSize: "var(--text-sm)",
      fontWeight: "var(--font-semibold)",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,

      marginBottom: 6,

      cursor: "pointer",

      background: "rgba(20,20,20,0.95)",
      backdropFilter: "blur(12px)",

      color: "var(--text-primary)",

      border: "1px solid var(--border-secondary)",

      transition:
        "background var(--transition-fast), border-color var(--transition-fast)",

      flexShrink: 0,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(255,255,255,0.10)";
      e.currentTarget.style.borderColor = "var(--border-hover)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(20,20,20,0.95)";
      e.currentTarget.style.borderColor = "var(--border-secondary)";
    }}
  >
    <Plus size={13} />
    New Chat
  </button>

  {/* Conversation list */}
  {loadingConvs ? (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            height: 42,
            borderRadius: "var(--radius-md)",
            flexShrink: 0,
          }}
        />
      ))}
    </>
  ) : (
    conversations.map((c) => {
      const isActive = activeId === c.id;

      return (
        <button
          key={c.id}
          onClick={() => void loadConversation(c.id)}
          style={{
            width: "100%",

            textAlign: "left",

            padding: "10px 12px",

            minHeight: 42,

            borderRadius: "var(--radius-md)",

            fontSize: "var(--text-sm)",

            cursor: "pointer",

            background: isActive
              ? "rgba(255,255,255,0.05)"
              : "transparent",

            color: isActive
              ? "var(--text-primary)"
              : "var(--text-subtle)",

            border: isActive
              ? "1px solid var(--border-secondary)"
              : "1px solid transparent",

            transition:
              "background var(--transition-fast), color var(--transition-fast)",

            overflow: "hidden",

            flexShrink: 0,

            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              overflow: "hidden",
            }}
          >
            <MessageSquare
              size={11}
              style={{
                opacity: 0.4,
                flexShrink: 0,
              }}
            />

            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                width: "100%",
              }}
            >
              {c.title}
            </span>
          </div>
        </button>
      );
    })
  )}
</div>

      {/* ── Chat Main ── */}
      <div
        style={{
          flex:          1,
          display:       "flex",
          flexDirection: "column",
          minHeight:     0,
          minWidth:      0,
        }}
      >
        <div
          className="glass-card"
          style={{
            flex:          1,
            display:       "flex",
            flexDirection: "column",
            minHeight:     0,
            overflow:      "hidden",
            borderRadius:  "var(--radius-xl)",
          }}
        >
          {/* Messages area */}
          <div
            style={{
              flex:             1,
              minHeight:        0,
              overflowY:        "auto",
              overscrollBehavior: "contain",
              padding:          "24px",
              display:          "flex",
              flexDirection:    "column",
              gap:              16,
              background:       "rgba(14,15,17,0.9)",
            }}
          >
            {/* Empty state */}
            {messages.length === 0 && (
              <div
                style={{
                  flex:           1,
                  minHeight:      240,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  {/* Logo mark */}
                  <div
                    style={{
                      width:           52,
                      height:          52,
                      borderRadius:    "var(--radius-xl)",
                      background:      "var(--gradient-card)",
                      border:          "1px solid var(--border-secondary)",
                      boxShadow:       "var(--shadow-card)",
                      display:         "flex",
                      alignItems:      "center",
                      justifyContent:  "center",
                      margin:          "0 auto 20px",
                      position:        "relative",
                      overflow:        "hidden",
                    }}
                  >
                    <div
                      style={{
                        position:   "absolute",
                        inset:      0,
                        background: "var(--gradient-overlay)",
                      }}
                    />
                    <Sparkles size={20} style={{ color: "var(--accent-primary)", position: "relative" }} />
                  </div>

                  <h2
                    style={{
                      fontSize:      "var(--text-xl)",
                      fontWeight:    "var(--font-semibold)",
                      letterSpacing: "var(--tracking-normal)",
                      color:         "var(--text-primary)",
                    }}
                  >
                    Guarded AI Agent
                  </h2>
                  <p
                    style={{
                      fontSize:  "var(--text-sm)",
                      color:     "var(--text-subtle)",
                      marginTop: 6,
                    }}
                  >
                    Send a message to start a conversation
                  </p>

                  {/* Quick prompts */}
                  <div
                    style={{
                      display:        "flex",
                      flexWrap:       "wrap",
                      gap:            8,
                      justifyContent: "center",
                      maxWidth:       400,
                      margin:         "20px auto 0",
                    }}
                  >
                    {["List workspace files", "What tools are available?", "Read a file"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        style={{
                          padding:      "6px 12px",
                          borderRadius: "var(--radius-md)",
                          fontSize:     "var(--text-xs)",
                          cursor:       "pointer",
                          background:   "rgba(255,255,255,0.03)",
                          color:        "var(--text-muted)",
                          border:       "1px solid var(--border-secondary)",
                          display:      "flex",
                          alignItems:   "center",
                          gap:          6,
                          transition:   "background var(--transition-fast), border-color var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hover)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-secondary)";
                        }}
                      >
                        <Sparkles size={10} style={{ color: "var(--accent-primary)", opacity: 0.8 }} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((m) => (
              <div
                key={m.id}
                className="animate-fade-in-up"
                style={{
                  display:        "flex",
                  justifyContent: m.role === "USER" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth:     "min(72vw, 640px)",
                    borderRadius: "var(--radius-lg)",
                    padding:      "12px 16px",
                    fontSize:     "var(--text-base)",
                    // USER: subtle white glass — ASSISTANT: dark glass
                    background:
                      m.role === "USER"
                        ? "rgba(255, 255, 255, 0.07)"
                        : "rgba(255, 255, 255, 0.03)",
                    color:  "var(--text-secondary)",
                    border:
                      m.role === "USER"
                        ? "1px solid var(--border-hover)"
                        : "1px solid var(--border-primary)",
                  }}
                >
                  {/* Thinking indicator */}
                  {m.role === "ASSISTANT" && m.streaming && (m.executions?.length ?? 0) === 0 ? (
                    <ThinkingInline />
                  ) : null}

                  {/* Execution timeline */}
                  {(m.executions?.length ?? 0) > 0 ? (
                    <ExecutionTimeline
                      executions={m.executions ?? []}
                      streaming={Boolean(m.streaming)}
                      defaultCollapsed={Boolean(m.executionTimelineCollapsed)}
                      autoCollapseWhenDone={!m.streaming}
                    />
                  ) : null}

                  {/* Message content */}
                  {m.content ? (
                    <pre
                      style={{
                        whiteSpace:  "pre-wrap",
                        fontFamily:  "inherit",
                        lineHeight:  1.65,
                        color:       "var(--text-secondary)",
                        marginTop:   (m.executions?.length ?? 0) > 0 ? 12 : 0,
                        paddingTop:  (m.executions?.length ?? 0) > 0 ? 12 : 0,
                        borderTop:   (m.executions?.length ?? 0) > 0 ? "1px solid var(--border-primary)" : "none",
                      }}
                    >
                      {m.content}
                    </pre>
                  ) : null}

                  {/* Tool call badges */}
                  {m.toolCalls && m.toolCalls.length > 0 ? (
                    <div
                      style={{
                        marginTop:   10,
                        paddingTop:  10,
                        display:     "flex",
                        flexDirection: "column",
                        gap:         6,
                        borderTop:   "1px solid var(--border-primary)",
                      }}
                    >
                      {m.toolCalls.map((tc, j) => {
                        const badge = policyBadge(tc.policyAction);
                        return (
                          <div
                            key={j}
                            style={{
                              display:    "flex",
                              alignItems: "center",
                              gap:        8,
                              flexWrap:   "wrap",
                              fontSize:   "var(--text-xs)",
                            }}
                          >
                            <span>
                              {tc.policyAction === "DENY"
                                ? "🚫"
                                : tc.policyAction === "REQUIRE_APPROVAL"
                                  ? "⏳"
                                  : tc.success
                                    ? "✅"
                                    : "❌"}
                            </span>
                            <code
                              style={{
                                fontFamily:   "var(--font-mono)",
                                opacity:      0.8,
                                overflow:     "hidden",
                                textOverflow: "ellipsis",
                                maxWidth:     200,
                                color:        "var(--text-muted)",
                              }}
                            >
                              {tc.toolName}
                            </code>
                            <span
                              className="status-badge"
                              style={{
                                background: badge.bg,
                                color:      badge.text,
                                border:     `1px solid ${badge.border}`,
                              }}
                            >
                              {tc.policyAction === "ALLOW"
                                ? "Allowed"
                                : tc.policyAction === "DENY"
                                  ? "Blocked"
                                  : "Approval"}
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

          {/* Input area */}
          <div
            style={{
              flexShrink:  0,
              padding:     "14px 16px",
              borderTop:   "1px solid var(--border-primary)",
              background:  "rgba(12,12,13,0.95)",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void sendMessage()}
                placeholder="Ask the AI agent…"
                disabled={loading}
                className="premium-input"
                style={{ borderRadius: "var(--radius-md)", padding: "12px 16px" }}
              />
              <button
                id="btn-send"
                type="button"
                onClick={() => void sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  padding:        "12px 14px",
                  borderRadius:   "var(--radius-md)",
                  cursor:         loading || !input.trim() ? "not-allowed" : "pointer",
                  opacity:        loading || !input.trim() ? 0.3 : 1,
                  flexShrink:     0,
                  background:     "rgba(255,255,255,0.08)",
                  color:          "var(--text-primary)",
                  border:         "1px solid var(--border-secondary)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  transition:     "background var(--transition-fast), border-color var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  if (!loading && input.trim()) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-secondary)";
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
