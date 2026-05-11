"use client";
import { useState, useEffect } from "react";
import { api, type PolicyRule } from "@/lib/api";

export default function PoliciesPage() {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", ruleType: "BLOCK", action: "DENY", toolPattern: "*", priority: 0 });

  const load = () => api.listPolicies().then((r) => setRules(r.data)).catch(() => {});
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

  const actionColor = (action: string) =>
    action === "DENY" ? "var(--danger)" : action === "REQUIRE_APPROVAL" ? "var(--warning)" : "var(--success)";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🛡️ Policy Rules</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Create and manage guardrail rules. Changes take effect instantly.
          </p>
        </div>
        <button
          id="btn-create-policy"
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          + New Rule
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl p-5 border space-y-4 animate-fade-in" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Tool Pattern</label>
              <input value={form.toolPattern} onChange={(e) => setForm({ ...form, toolPattern: e.target.value })}
                placeholder="e.g. delete_*, write_file, *"
                className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Rule Type</label>
              <select value={form.ruleType} onChange={(e) => {
                const rt = e.target.value;
                const action = rt === "BLOCK" ? "DENY" : rt === "APPROVAL" ? "REQUIRE_APPROVAL" : "ALLOW";
                setForm({ ...form, ruleType: rt, action });
              }}
                className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                <option value="BLOCK">Block (DENY)</option>
                <option value="APPROVAL">Require Approval</option>
                <option value="VALIDATION">Input Validation</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Priority</label>
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--text-secondary)" }}>Cancel</button>
            <button id="btn-save-policy" onClick={create} className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--accent)", color: "#fff" }}>Save Rule</button>
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg-hover)" }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Name</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Pattern</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Action</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Priority</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Status</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-t transition-colors" style={{ borderColor: "var(--border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td className="px-4 py-3">
                  <div className="font-medium">{rule.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{rule.description}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{rule.toolPattern}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: actionColor(rule.action), color: "#000" }}>
                    {rule.action}
                  </span>
                </td>
                <td className="px-4 py-3">{rule.priority}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(rule.id)}
                    className="px-2 py-0.5 rounded text-xs font-medium transition-all"
                    style={{ background: rule.enabled ? "var(--success)" : "var(--border)", color: rule.enabled ? "#000" : "var(--text-secondary)" }}>
                    {rule.enabled ? "ON" : "OFF"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(rule.id)} className="text-xs px-2 py-1 rounded transition-all hover:opacity-80"
                    style={{ color: "var(--danger)" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 && (
          <div className="p-8 text-center" style={{ color: "var(--text-secondary)" }}>No policy rules configured.</div>
        )}
      </div>
    </div>
  );
}
