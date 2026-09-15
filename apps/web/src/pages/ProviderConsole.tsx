import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "../api";
import { GlassCard, Chip, KpiTile, Spinner, ProgressBar, EmptyState } from "../components/ui";

interface Signal {
  skill: string;
  avgLevel: number;
  students: number;
  belowThresholdPct: number;
}

interface Trainee {
  id: string;
  name: string;
  district: string;
  course: string;
  cohort: string;
  status: string;
  avgSkill: number;
  placed: boolean;
  salary: number | null;
}

export default function ProviderConsole() {
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [trainees, setTrainees] = useState<Trainee[] | null>(null);
  const [provider, setProvider] = useState<{ name: string; state: string } | null>(null);

  useEffect(() => {
    api<{ name: string; state: string }>("/provider/me").then(setProvider).catch(() => {});
    api<Signal[]>("/provider/curriculum-signals").then(setSignals).catch(() => setSignals([]));
    api<Trainee[]>("/provider/trainees").then(setTrainees).catch(() => setTrainees([]));
  }, []);

  if (!signals || !trainees) return <Spinner label="Loading provider console…" />;

  const placed = trainees.filter((t) => t.placed).length;
  const placementPct = trainees.length ? Math.round((placed / trainees.length) * 100) : 0;
  const salaries = trainees.filter((t) => t.salary).map((t) => t.salary!);
  const avgSalary = salaries.length ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">{provider?.name ?? "Provider"} Console</h1>
        <p className="text-sm text-slate-500">Your cohort outcomes — and where the curriculum needs attention.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KpiTile label="Trainees" value={trainees.length} />
        <KpiTile label="Placement %" value={`${placementPct}%`} />
        <KpiTile label="Avg salary" value={`₹${avgSalary.toLocaleString("en-IN")}`} />
        <KpiTile label="Courses" value={new Set(trainees.map((t) => t.course)).size} />
      </div>

      <GlassCard className="p-6">
        <h2 className="section-title">🩺 Curriculum signals <span className="text-xs font-normal text-slate-500">— weakest skill areas across your cohorts</span></h2>
        {signals.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">Not enough assessment data yet.</div>
        ) : (
          <>
            <div className="mt-4 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signals}>
                  <CartesianGrid stroke="rgba(15,23,42,0.08)" />
                  <XAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12 }} />
                  <Bar dataKey="avgLevel" name="Avg level" fill="#fb923c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {signals.slice(0, 4).map((s) => (
                <div key={s.skill} className="glass-soft flex items-center gap-3 p-3 text-sm">
                  <span className="w-32 truncate font-semibold">{s.skill}</span>
                  <div className="flex-1"><ProgressBar value={s.avgLevel} tone={s.avgLevel < 55 ? "pink" : "green"} /></div>
                  <span className="text-xs text-slate-500">{s.belowThresholdPct}% below 55</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-xs text-amber-700">
              💡 Action: if a skill averages below 55 across cohorts, revise that module or add the recommended free
              resource (from the trainee roadmap engine) to your course.
            </div>
          </>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="section-title">👥 Your trainees <span className="text-xs font-normal text-slate-500">(first 50 shown)</span></h2>
        {trainees.length === 0 ? (
          <EmptyState icon="👥" title="No trainees yet" />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Cohort</th>
                  <th className="px-3 py-2">Avg skill</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {trainees.slice(0, 50).map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-3 py-2.5 font-semibold">{t.name}<div className="text-[11px] text-slate-500">{t.district}</div></td>
                    <td className="px-3 py-2.5 text-slate-600">{t.course}</td>
                    <td className="px-3 py-2.5"><Chip>{t.cohort}</Chip></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20"><ProgressBar value={t.avgSkill} tone={t.avgSkill >= 60 ? "green" : "amber"} /></div>
                        <span className="text-xs">{t.avgSkill}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {t.placed ? <Chip tone="green">placed{t.salary ? ` · ₹${(t.salary / 1000).toFixed(0)}k` : ""}</Chip> : <Chip tone="amber">{t.status}</Chip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
