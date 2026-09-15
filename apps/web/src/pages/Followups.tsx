import { useEffect, useState } from "react";
import { api } from "../api";
import { GlassCard, Chip, Spinner, EmptyState } from "../components/ui";

interface FollowUp {
  id: string;
  milestone: number;
  dueAt: string;
  completedAt: string | null;
  stillEmployed: boolean | null;
  currentSalary: number | null;
  skillUsage: number | null;
  channel: string | null;
  placement: { employer: string; jobTitle: string; monthlySalary: number };
}

export default function Followups() {
  const [rows, setRows] = useState<FollowUp[] | null>(null);
  const [active, setActive] = useState<FollowUp | null>(null);
  const [form, setForm] = useState({ stillEmployed: true, currentSalary: 0, skillUsage: 70, notes: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await api<FollowUp[]>("/followups");
      setRows(r);
    } catch {
      setRows([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openCheckin = (f: FollowUp) => {
    setActive(f);
    setForm({ stillEmployed: true, currentSalary: f.placement.monthlySalary, skillUsage: 70, notes: "" });
  };

  const submit = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await api(`/followups/${active.id}/complete`, { method: "POST", body: form });
      setActive(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
    setBusy(false);
  };

  if (rows === null) return <Spinner label="Loading follow-ups…" />;
  if (rows.length === 0)
    return <EmptyState icon="📆" title="No follow-ups yet" hint="Follow-ups unlock after your first placement — 3, 6 and 12-month career check-ins." />;

  const due = rows.filter((f) => !f.completedAt && new Date(f.dueAt) <= new Date());
  const upcoming = rows.filter((f) => !f.completedAt && new Date(f.dueAt) > new Date());
  const done = rows.filter((f) => f.completedAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Longitudinal Follow-ups</h1>
        <p className="text-sm text-slate-500">
          Quick check-ins at 3, 6 and 12 months — your updates power retention and salary analytics for the whole program.
        </p>
      </div>

      {due.length > 0 && (
        <GlassCard className="border-amber-400/30 p-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <span className="font-bold text-amber-600">{due.length} check-in{due.length > 1 ? "s" : ""} due</span>
          </div>
          <div className="mt-3 space-y-2">
            {due.map((f) => (
              <div key={f.id} className="glass-soft flex flex-wrap items-center gap-3 p-4">
                <div>
                  <div className="font-bold">{f.milestone}-month · {f.placement.employer}</div>
                  <div className="text-xs text-slate-500">was due {new Date(f.dueAt).toLocaleDateString("en-IN")} · ₹{f.placement.monthlySalary.toLocaleString("en-IN")}/mo at joining</div>
                </div>
                <button className="btn-primary ml-auto !py-2 text-xs" onClick={() => openCheckin(f)}>
                  Complete check-in (2 min) →
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {active && (
        <GlassCard className="space-y-4 border-cyan-400/30 p-6">
          <h2 className="section-title">Check-in: {active.milestone}-month at {active.placement.employer}</h2>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.stillEmployed} onChange={(e) => setForm({ ...form, stillEmployed: e.target.checked })} className="h-4 w-4 accent-cyan-400" />
            <span className="text-slate-600">I'm still working here (or self-employed)</span>
          </label>
          {form.stillEmployed && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-500">Current monthly salary (₹)
                <input type="number" className="glass-input mt-1 w-full" value={form.currentSalary} onChange={(e) => setForm({ ...form, currentSalary: Number(e.target.value) })} />
              </label>
              <label className="text-xs text-slate-500">Share of daily work using your trained skills — {form.skillUsage}%
                <input type="range" min={0} max={100} step={5} value={form.skillUsage} onChange={(e) => setForm({ ...form, skillUsage: Number(e.target.value) })} className="mt-3 w-full accent-cyan-400" />
              </label>
            </div>
          )}
          {!form.stillEmployed && (
            <input className="glass-input w-full" placeholder="What changed? (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          )}
          <div className="flex gap-3">
            <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Submit check-in ✓"}</button>
            <button className="btn-secondary" onClick={() => setActive(null)}>Cancel</button>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="section-title">⏳ Upcoming</h3>
          <div className="mt-3 space-y-2">
            {upcoming.length === 0 && <div className="text-sm text-slate-500">Nothing scheduled.</div>}
            {upcoming.map((f) => (
              <div key={f.id} className="glass-soft flex items-center gap-3 p-3 text-sm">
                <Chip tone="violet">{f.milestone}mo</Chip>
                <span>{f.placement.employer}</span>
                <span className="ml-auto text-xs text-slate-500">due {new Date(f.dueAt).toLocaleDateString("en-IN")}</span>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="section-title">✅ Completed</h3>
          <div className="mt-3 space-y-2">
            {done.length === 0 && <div className="text-sm text-slate-500">No completed check-ins yet.</div>}
            {done.map((f) => (
              <div key={f.id} className="glass-soft flex flex-wrap items-center gap-2 p-3 text-sm">
                <Chip tone="green">{f.milestone}mo ✓</Chip>
                <span>{f.placement.employer}</span>
                <span className="ml-auto text-xs text-slate-500">
                  {f.stillEmployed ? `still employed · ₹${f.currentSalary?.toLocaleString("en-IN")}/mo` : "left job"} · via {f.channel}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
