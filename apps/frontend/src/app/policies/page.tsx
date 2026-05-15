"use client";
import { useState, useEffect } from "react";
import { api, type PolicyRule } from "@/lib/api";
import { ShieldCheck, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

function PolicySkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card"
          style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="skeleton-line" style={{ height: 14, width: 140 }} />
              <div className="skeleton-line" style={{ height: 18, width: 80, borderRadius: 999 }} />
            </div>
            <div className="skeleton-line" style={{ height: 12, width: 220 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="skeleton-line" style={{ height: 32, width: 32, borderRadius: "var(--radius-md)" }} />
            <div className="skeleton-line" style={{ height: 32, width: 32, borderRadius: "var(--radius-md)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PoliciesPage() {
  const [rules, setRules]           = useState<PolicyRule[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", ruleType: "BLOCK", action: "DENY", toolPattern: "*", priority: 0,
  });

  const load = () => {
    setLoading(true);
    api.listPolicies().then((r) => setRules(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.toolPattern) return;
    await api.createPolicy(form);
    setShowCreate(false);
    setForm({ name: "", description: "", ruleType: "BLOCK", action: "DENY", toolPattern: "*", priority: 0 });
    load();
  };

  const toggle = async (id: string) => { await api.togglePolicy(id); load(); };
  const remove = async (id: string) => { if (confirm("Delete this rule?")) { await api.deletePolicy(id); load(); } };

  const actionStyle = (action: string) => {
    if (action === "DENY")             return { bg: "rgba(239,68,68,0.08)",   color: "#EF4444", border: "rgba(239,68,68,0.15)" };
    if (action === "REQUIRE_APPROVAL") return { bg: "rgba(245,158,11,0.08)",  color: "#F59E0B", border: "rgba(245,158,11,0.15)" };
    return                                    { bg: "rgba(214,235,253,0.06)", color: "#D6EBFD", border: "rgba(214,235,253,0.10)" };
  };

  const LabelText = ({ children }: { children: React.ReactNode }) => (
    <label
      style={{
        display:        "block",
        fontSize:       "var(--text-xs)",
        fontWeight:     "var(--font-semibold)",
        textTransform:  "uppercase",
        letterSpacing:  "0.08em",
        color:          "var(--text-subtle)",
        marginBottom:   6,
      }}
    >
      {children}
    </label>
  );

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 900 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        {/* Icon */}
        <div
          className="page-header-icon"
          style={{ width: 56, height: 56 }}
        >
          <ShieldCheck size={22} style={{ color: "var(--accent-primary)", position: "relative" }} />
        </div>

        <div style={{ flex: 1 }}>
          <h1 className="page-title">Policy Rules</h1>
          <p className="page-subtitle" style={{ fontSize: "var(--text-md)" }}>
            Guardrail rules enforce security. Changes take effect instantly via Redis.
          </p>
        </div>

        <button
          id="btn-create-policy"
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary"
          style={{ marginTop: 8 }}
        >
          <Plus size={14} />
          New Rule
        </button>
      </div>

      {/* ── Create Form ── */}
      {showCreate && (
        <div
          className="glass-card animate-fade-in-up"
          style={{ padding: "var(--card-padding)" }}
        >
          <h3
            style={{
              fontSize:      "var(--text-lg)",
              fontWeight:    "var(--font-semibold)",
              letterSpacing: "var(--tracking-normal)",
              color:         "var(--text-primary)",
              marginBottom:  20,
            }}
          >
            New Policy Rule
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <LabelText>Name</LabelText>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="premium-input"
                placeholder="e.g. Block file deletion"
              />
            </div>
            <div>
              <LabelText>Tool Pattern</LabelText>
              <input
                value={form.toolPattern}
                onChange={(e) => setForm({ ...form, toolPattern: e.target.value })}
                placeholder="e.g. delete_*, write_file"
                className="premium-input"
              />
            </div>
            <div>
              <LabelText>Rule Type</LabelText>
              <select
                value={form.ruleType}
                onChange={(e) => {
                  const rt = e.target.value;
                  const action = rt === "BLOCK" ? "DENY" : rt === "APPROVAL" ? "REQUIRE_APPROVAL" : "ALLOW";
                  setForm({ ...form, ruleType: rt, action });
                }}
                className="premium-input"
              >
                <option value="BLOCK">Block (DENY)</option>
                <option value="APPROVAL">Require Approval</option>
                <option value="VALIDATION">Input Validation</option>
              </select>
            </div>
            <div>
              <LabelText>Priority</LabelText>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="premium-input"
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <LabelText>Description</LabelText>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="premium-input"
              placeholder="Optional description"
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowCreate(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              id="btn-save-policy"
              onClick={create}
              className="btn-primary"
            >
              Save Rule
            </button>
          </div>
        </div>
      )}

      {/* ── Rules List ── */}
      {loading ? (
        <PolicySkeleton />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rules.map((rule) => {
            const as = actionStyle(rule.action);
            return (
              <div
                key={rule.id}
                className="glass-card"
                style={{
                  padding:    "16px 20px",
                  display:    "flex",
                  alignItems: "center",
                  gap:        16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize:   "var(--text-base)",
                        fontWeight: "var(--font-medium)",
                        color:      "var(--text-primary)",
                      }}
                    >
                      {rule.name}
                    </span>
                    <span
                      className="status-badge"
                      style={{ background: as.bg, color: as.color, border: `1px solid ${as.border}` }}
                    >
                      {rule.action}
                    </span>
                    {!rule.enabled && (
                      <span
                        className="status-badge"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          color:      "var(--text-disabled)",
                          border:     "1px solid var(--border-primary)",
                        }}
                      >
                        DISABLED
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                    <code
                      style={{
                        fontSize:   "var(--text-xs)",
                        fontFamily: "var(--font-mono)",
                        color:      "var(--text-subtle)",
                      }}
                    >
                      pattern: {rule.toolPattern}
                    </code>
                    <span style={{ color: "var(--text-disabled)", fontSize: 10 }}>•</span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>
                      priority: {rule.priority}
                    </span>
                  </div>

                  {rule.description && (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-disabled)", marginTop: 4 }}>
                      {rule.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    onClick={() => toggle(rule.id)}
                    className="btn-ghost"
                    style={{
                      padding: "6px 8px",
                      color: rule.enabled ? "#D6EBFD" : "var(--text-disabled)",
                    }}
                  >
                    {rule.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => remove(rule.id)}
                    className="btn-ghost"
                    style={{ padding: "6px 8px", color: "var(--danger)" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && rules.length === 0 && (
        <div
          className="glass-card"
          style={{
            padding:        48,
            textAlign:      "center",
            color:          "var(--text-subtle)",
            fontSize:       "var(--text-base)",
          }}
        >
          No policy rules configured.
        </div>
      )}
    </div>
  );
}
