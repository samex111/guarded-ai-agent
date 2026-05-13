"use client";

import { useEffect, useState } from "react";
import { api, type LeadSummary } from "@/lib/api";
import { Users, Loader2 } from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  const load = () => {
    setLoading(true);
    api
      .listLeads({
        page: 1,
        pageSize: 50,
        status: status || undefined,
      })
      .then((r) => {
        setLeads(r.data.items);
        setTotal(r.data.total);
      })
      .catch(() => {
        setLeads([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [status]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.08))",
              border: "1px solid rgba(59,130,246,0.2)",
            }}
          >
            <Users size={20} style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
              {total} total — temporary leads expire after 24h unless saved.
            </p>
          </div>
        </div>
        <select
          className="rounded-xl px-3 py-2 text-sm glass-card border border-white/10 bg-transparent"
          style={{ color: "#E2E8F0" }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="TEMPORARY">Temporary</option>
          <option value="SAVED">Saved</option>
        </select>
      </div>

      {loading && leads.length === 0 ? (
        <div className="glass-card p-12 flex justify-center">
          <Loader2 className="animate-spin" style={{ color: "#3B82F6" }} size={28} />
        </div>
      ) : leads.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-base font-semibold">No leads yet</p>
          <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>
            Use the agent with <code className="text-[11px]">analyze_website</code> or POST{" "}
            <code className="text-[11px]">/api/public/scrape</code>.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10" style={{ color: "#94A3B8" }}>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Website</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((L) => (
                <tr key={L.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium" style={{ color: "#F1F5F9" }}>
                    {L.name || "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[220px] truncate" style={{ color: "#94A3B8" }}>
                    {L.website}
                  </td>
                  <td className="px-4 py-3">{L.leadScore}</td>
                  <td className="px-4 py-3">{L.priority}</td>
                  <td className="px-4 py-3">{L.status}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748B" }}>
                    {L.expiresAt ? new Date(L.expiresAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
