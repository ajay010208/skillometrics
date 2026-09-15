import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "../api";
import { GlassCard, Chip, Spinner, ProgressBar, EmptyState } from "../components/ui";
import { SearchSelect } from "../components/SearchSelect";

interface Insights {
  role: string;
  state: string;
  national: { min: number; max: number; avg: number; count: number } | null;
  stateBand: { min: number; max: number; avg: number; count: number } | null;
  local: { min: number; max: number; avg: number; count: number } | null;
  districts: Array<{ district: string; jobs: number; avgSalary: number }>;
  topSkills: Array<{ skill: string; pct: number }>;
  placedSample: { national: number; state: number; nationalAvgSalary: number; stateAvgSalary: number };
  readinessSkillGaps: Array<{ skill: string; marketPct: number; yourLevel: number; requiredLevel: number }>;
}

interface LocalJob {
  id: string;
  title: string;
  company: string;
  district: string;
  salaryMin: number;
  salaryMax: number;
  source: string;
}

const STATES = ["Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal"];

export default function MarketInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [state, setState] = useState<string>("");
  const [jobs, setJobs] = useState<LocalJob[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Insights>(`/market/insights${state ? `?state=${encodeURIComponent(state)}` : ""}`)
      .then((d) => {
        setData(d);
        setState((s) => s || d.state);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [state]);

  useEffect(() => {
    if (!state) return;
    api<LocalJob[]>(`/market/local-jobs?state=${encodeURIComponent(state)}`).then(setJobs).catch(() => setJobs([]));
  }, [state]);

  const statesFor = async (q: string) => {
    const needle = q.trim().toLowerCase();
    return STATES.filter((s) => !needle || s.toLowerCase().includes(needle)).map((label) => ({ label }));
  };

  if (err) return <EmptyState icon="📊" title="Market insights unavailable" hint={err} />;
  if (!data) return <Spinner label="Analyzing your local job market…" />;

  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">📍 Salary trends & market demand — {data.role}</h2>
          <p className="text-xs text-slate-500">Computed from live postings and verified placements.</p>
        </div>
        <div className="w-56">
          <SearchSelect value={state} onSelect={setState} getOptions={statesFor} placeholder="Change state…" />
        </div>
      </div>

      {/* salary bands */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["🇮🇳 National", data.national, "all postings for this role"],
          ["State avg", data.stateBand, `postings in ${data.state}`],
          ["Your city tier", data.local, `top districts in ${data.state}`],
        ].map(([label, band, sub]) => (
          <GlassCard key={label as string} className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label as string}</div>
            {band ? (
              <>
                <div className="kpi-value mt-2">{inr((band as { avg: number }).avg)}</div>
                <div className="mt-1 text-xs text-slate-500">
                  range {inr((band as { min: number }).min)}–{inr((band as { max: number }).max)} · {(band as { count: number }).count} postings
                </div>
              </>
            ) : (
              <div className="mt-3 text-sm text-slate-500">No postings yet</div>
            )}
            <div className="mt-2 text-[11px] text-slate-500">{sub as string}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* district salary chart */}
        <GlassCard className="p-6">
          <h3 className="section-title text-base">Average salary by district in {data.state}</h3>
          {data.districts.length === 0 ? (
            <div className="mt-3 text-sm text-slate-500">No postings in this state yet.</div>
          ) : (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.districts.slice(0, 6)}>
                  <CartesianGrid stroke="rgba(15,23,42,0.08)" />
                  <XAxis dataKey="district" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12 }} formatter={(v: number) => [inr(v), "avg"]} />
                  <Bar dataKey="avgSalary" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        {/* in-demand skills vs you */}
        <GlassCard className="p-6">
          <h3 className="section-title text-base">What employers want vs your level</h3>
          <div className="mt-4 space-y-3">
            {data.readinessSkillGaps.map((s) => (
              <div key={s.skill}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{s.skill}</span>
                  <span className="text-slate-500">
                    demand <b className="text-orange-600">{s.marketPct}%</b> · your level <b className="text-amber-600">{s.yourLevel}</b>, need {s.requiredLevel}
                  </span>
                </div>
                <ProgressBar value={s.yourLevel} tone={s.yourLevel >= s.requiredLevel ? "green" : "pink"} />
              </div>
            ))}
            {data.readinessSkillGaps.length === 0 && <div className="text-sm text-slate-500">Set a target job to see this.</div>}
          </div>
        </GlassCard>
      </div>

      {/* local jobs filtered by state */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="section-title text-base">💼 Jobs in {state}</h3>
          <Chip tone="cyan">{jobs?.length ?? 0} openings</Chip>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {jobs === null && <Spinner label="" />}
          {jobs?.length === 0 && <div className="text-sm text-slate-500">No openings in {state} right now — check neighbouring states on the Jobs page.</div>}
          {jobs?.slice(0, 8).map((j) => (
            <div key={j.id} className="glass-soft flex flex-wrap items-center gap-2 p-3.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{j.title} <span className="text-slate-500">· {j.company}</span></div>
                <div className="text-[11px] text-slate-500">📍 {j.district} · {inr(j.salaryMin)}–{inr(j.salaryMax)}/mo · {j.source}</div>
              </div>
              <Chip tone="green">48h</Chip>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
