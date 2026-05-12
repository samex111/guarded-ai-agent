"use client";
import { useState, useEffect } from "react";
import { api, type PolicyRule } from "@/lib/api";
import { ShieldCheck, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

function PolicySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="skeleton-line h-4 w-40" />
              <div className="skeleton-line h-5 w-20 rounded-full" />
            </div>
            <div className="skeleton-line h-3 w-60" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton-line h-8 w-8 rounded-lg" />
            <div className="skeleton-line h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PoliciesPage() {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", ruleType: "BLOCK", action: "DENY", toolPattern: "*", priority: 0 });

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
    if (action === "DENY") return { bg: "rgba(239,68,68,0.12)", color: "#EF4444", border: "rgba(239,68,68,0.2)" };
    if (action === "REQUIRE_APPROVAL") return { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "rgba(245,158,11,0.2)" };
    return { bg: "rgba(34,197,94,0.12)", color: "#22C55E", border: "rgba(34,197,94,0.2)" };
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.08))", border: "1px solid rgba(59,130,246,0.2)" }}>
            <ShieldCheck size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Policy Rules</h1>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Guardrail rules enforce security. Changes take effect instantly via Redis.</p>
          </div>
        </div>
        <button id="btn-create-policy" onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300" style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "#fff", boxShadow: "0 4px 16px rgba(59,130,246,0.25)" }}>
          <Plus size={14} /> New Rule
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card p-5 space-y-4 animate-fade-in-up">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "#64748B" }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="premium-input w-full" />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "#64748B" }}>Tool Pattern</label>
              <input value={form.toolPattern} onChange={(e) => setForm({ ...form, toolPattern: e.target.value })} placeholder="e.g. delete_*, write_file" className="premium-input w-full" />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "#64748B" }}>Rule Type</label>
              <select value={form.ruleType} onChange={(e) => {
                const rt = e.target.value;
                const action = rt === "BLOCK" ? "DENY" : rt === "APPROVAL" ? "REQUIRE_APPROVAL" : "ALLOW";
                setForm({ ...form, ruleType: rt, action });
              }} className="premium-input w-full">
                <option value="BLOCK">Block (DENY)</option>
                <option value="APPROVAL">Require Approval</option>
                <option value="VALIDATION">Input Validation</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "#64748B" }}>Priority</label>
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="premium-input w-full" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "#64748B" }}>Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="premium-input w-full" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-xs" style={{ color: "#64748B" }}>Cancel</button>
            <button id="btn-save-policy" onClick={create} className="px-5 py-2 rounded-xl text-xs font-semibold" style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "#fff" }}>Save Rule</button>
          </div>
        </div>
      )}

      {/* Rules */}
      {loading ? <PolicySkeleton /> : (
        <div className="grid gap-3">
          {rules.map((rule) => {
            const as = actionStyle(rule.action);
            return (
              <div key={rule.id} className="glass-card p-4 flex items-center gap-4 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-medium">{rule.name}</span>
                    <span className="status-badge" style={{ background: as.bg, color: as.color, border: `1px solid ${as.border}` }}>{rule.action}</span>
                    {!rule.enabled && <span className="status-badge" style={{ background: "rgba(255,255,255,0.05)", color: "#475569" }}>DISABLED</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs font-mono" style={{ color: "#64748B" }}>pattern: {rule.toolPattern}</span>
                    <span className="text-xs" style={{ color: "#475569" }}>•</span>
                    <span className="text-xs" style={{ color: "#64748B" }}>priority: {rule.priority}</span>
                  </div>
                  {rule.description && <p className="text-xs mt-1" style={{ color: "#475569" }}>{rule.description}</p>}
                </div>
                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggle(rule.id)} className="p-2 rounded-lg transition-all" style={{ color: rule.enabled ? "#22C55E" : "#475569" }}>
                    {rule.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button onClick={() => remove(rule.id)} className="p-2 rounded-lg transition-all hover:bg-red-500/10" style={{ color: "#EF4444" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && rules.length === 0 && (
        <div className="glass-card p-12 text-center" style={{ color: "#64748B" }}>No policy rules configured.</div>
      )}
    </div>
  );
}
