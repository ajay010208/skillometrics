import { useEffect, useRef, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from "recharts";
import { api } from "../api";
import { GlassCard, Chip, KpiTile, Spinner, SourceBadge } from "../components/ui";

const COLORS = ["#f59e0b", "#fb923c", "#34d399", "#fbbf24", "#64748b"];

/** Cinematic backdrop video (fixed behind the frosted glass cards). */
const VIDEO_BG = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4";

interface Kpis {
  traineesTotal: number;
  placedCount: number;
  placementPct: number;
  avgSalary: number;
  medianSalary: number;
  selfEmployed: number;
  apprenticeships: number;
  retention: { m3: number | null; m6: number | null; m12: number | null };
  wageGrowthPct: number | null;
  selfEmploymentPct: number;
}

const STATES = ["", "Maharashtra","Uttar Pradesh","Bihar","Tamil Nadu","Karnataka","West Bengal","Rajasthan","Madhya Pradesh","Telangana","Gujarat","Odisha","Kerala"];

export default function Dashboard() {
  const [filters, setFilters] = useState({ state: "", district: "", gender: "", category: "" });
  const [tab, setTab] = useState<"outcomes" | "insights" | "consent">("outcomes");
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [outcomes, setOutcomes] = useState<Array<{ name: string; value: number }> | null>(null);
  const [retention, setRetention] = useState<Array<{ months: number; retentionPct: number | null }> | null>(null);
  const [salaries, setSalaries] = useState<Array<{ months: number; avgSalary: number | null; sample: number }> | null>(null);
  const [states, setStates] = useState<Array<{ state: string; trainees: number; placementPct: number; avgSalary: number }> | null>(null);
  const [skillDemand, setSkillDemand] = useState<Array<{ skill: string; demand: number }> | null>(null);
  const [insights, setInsights] = useState<{ stats: Array<{ label: string; pct: number; count: number }>; insights: string[]; source: string } | null>(null);
  const [consent, setConsent] = useState<{ total: number; tracking: number; recruiterVisible: number; logs: Array<{ id: string; action: string; detail: string | null; createdAt: string; trainee: { name: string } }> } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    const qs = params.toString();
    setKpis(null);
    api<Kpis>(`/dashboard/kpis?${qs}`).then(setKpis).catch(() => {});
    api<Array<{ name: string; value: number }>>(`/dashboard/outcomes?${qs}`).then(setOutcomes).catch(() => {});
    api<Array<{ months: number; retentionPct: number | null }>>(`/dashboard/retention-curve?${qs}`).then(setRetention).catch(() => {});
    api<Array<{ months: number; avgSalary: number | null; sample: number }>>(`/dashboard/salary-progressions?${qs}`).then(setSalaries).catch(() => {});
    api<Array<{ state: string; trainees: number; placementPct: number; avgSalary: number }>>("/dashboard/state-comparison").then(setStates).catch(() => {});
    api<Array<{ skill: string; demand: number }>>("/dashboard/skill-demand").then(setSkillDemand).catch(() => {});
  }, [filters]);

  useEffect(() => {
    if (tab === "insights" && !insights) {
      api<{ stats: Array<{ label: string; pct: number; count: number }>; insights: string[]; source: string }>("/dashboard/insights")
        .then(setInsights)
        .catch(() => {});
    }
    if (tab === "consent" && !consent) {
      api<typeof consent>("/dashboard/consent-stats").then(setConsent).catch(() => {});
    }
  }, [tab, insights, consent]);

  // Kick muted autoplay in strict webviews (same fallback as the opening page).
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    const kick = () => {
      tryPlay();
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, []);

  if (!kpis) return <Spinner label="Crunching impact numbers…" />;

  return (
    <div className="relative">
      {/* fullscreen looping video backdrop + white veil for readability */}
      <video
        ref={videoRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        src={VIDEO_BG}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-white/85" />
      <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Government Impact Dashboard</h1>
          <p className="text-sm text-slate-500">Longitudinal outcomes across cohorts, providers, districts and states — consent-based.</p>
        </div>
        <div className="flex gap-2">
          {(["outcomes", "insights", "consent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-xs font-bold capitalize ${tab === t ? "bg-amber-500/15 text-amber-600" : "bg-slate-900/5 text-slate-500"}`}
            >
              {t === "outcomes" ? "📊 Outcomes" : t === "insights" ? "🤖 AI Analytics" : "🔒 Consent"}
            </button>
          ))}
        </div>
      </div>

      {/* filters */}
      <GlassCard className="flex flex-wrap gap-3 p-4">
        <select className="glass-input w-44" value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })}>
          {STATES.map((s) => <option key={s} value={s}>{s || "All states"}</option>)}
        </select>
        <input className="glass-input w-40" placeholder="District" value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })} />
        <select className="glass-input w-40" value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}>
          <option value="">All genders</option>
          <option>Female</option>
          <option>Male</option>
        </select>
        <select className="glass-input w-40" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All categories</option>
          {["General", "OBC", "SC", "ST", "EWS"].map((c) => <option key={c}>{c}</option>)}
        </select>
        {(filters.state || filters.district || filters.gender || filters.category) && (
          <button className="btn-ghost text-xs" onClick={() => setFilters({ state: "", district: "", gender: "", category: "" })}>✕ Clear</button>
        )}
      </GlassCard>

      {tab === "outcomes" && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Placement rate" value={`${kpis.placementPct}%`} sub={`${kpis.placedCount} of ${kpis.traineesTotal} tracked trainees`} />
            <KpiTile label="Avg starting salary" value={`₹${kpis.avgSalary.toLocaleString("en-IN")}`} sub={`median ₹${kpis.medianSalary.toLocaleString("en-IN")}`} />
            <KpiTile
              label="Retention"
              value={kpis.retention.m3 !== null ? `${kpis.retention.m3}%` : "—"}
              sub={`3mo · 6mo ${kpis.retention.m6 ?? "—"}% · 12mo ${kpis.retention.m12 ?? "—"}%`}
            />
            <KpiTile label="Wage growth" value={kpis.wageGrowthPct !== null ? `+${kpis.wageGrowthPct}%` : "—"} sub="placement → latest follow-up" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiTile label="Self-employed" value={kpis.selfEmployed} sub={`${kpis.selfEmploymentPct}% of placements`} />
            <KpiTile label="Apprenticeships" value={kpis.apprenticeships} />
            <KpiTile label="States covered" value={states?.length ?? "…"} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* outcomes donut */}
            <GlassCard className="p-6">
              <h2 className="section-title">Training outcomes</h2>
              {outcomes && (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={outcomes.filter((o) => o.value > 0)} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                        {outcomes.filter((o) => o.value > 0).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>

            {/* retention curve */}
            <GlassCard className="p-6">
              <h2 className="section-title">Retention curve <span className="text-xs font-normal text-slate-500">(% still employed after placement)</span></h2>
              {retention && (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={retention}>
                      <CartesianGrid stroke="rgba(15,23,42,0.08)" />
                      <XAxis dataKey="months" tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(m) => `${m}mo`} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12 }} />
                      <Line type="monotone" dataKey="retentionPct" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#f59e0b" }} name="retained %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>

            {/* salary progression */}
            <GlassCard className="p-6">
              <h2 className="section-title">Salary progression <span className="text-xs font-normal text-slate-500">(avg monthly ₹ by months since placement)</span></h2>
              {salaries && (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salaries}>
                      <CartesianGrid stroke="rgba(15,23,42,0.08)" />
                      <XAxis dataKey="months" tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(m) => `${m}mo`} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12 }}
                        formatter={(v: number) => [`₹${v?.toLocaleString("en-IN")}`, "avg salary"]}
                      />
                      <Bar dataKey="avgSalary" fill="#34d399" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>

            {/* skill demand */}
            <GlassCard className="p-6">
              <h2 className="section-title">Skill demand <span className="text-xs font-normal text-slate-500">(requirements across live jobs)</span></h2>
              {skillDemand && (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={skillDemand.slice(0, 8)} layout="vertical">
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis type="category" dataKey="skill" width={110} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12 }} />
                      <Bar dataKey="demand" fill="#fb923c" radius={[0, 6, 6, 0]} name="job postings" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>
          </div>

          {/* state comparison */}
          <GlassCard className="p-6">
            <h2 className="section-title">State comparison</h2>
            {states && (
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={states}>
                    <CartesianGrid stroke="rgba(15,23,42,0.08)" />
                    <XAxis dataKey="state" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="placementPct" name="placement %" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="trainees" name="trainees" fill="#fb923c" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {tab === "insights" && (
        <div className="space-y-5">
          {!insights ? <Spinner label="Mining non-placement patterns…" /> : (
            <>
              <GlassCard className="p-6">
                <div className="flex items-center gap-3">
                  <h2 className="section-title">Why people aren't getting jobs</h2>
                  <SourceBadge source={insights.source} />
                </div>
                <div className="mt-4 space-y-3">
                  {insights.stats.map((s) => (
                    <div key={s.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-slate-700">{s.label}</span>
                        <span className="font-bold text-amber-600">{s.pct}% <span className="text-xs font-normal text-slate-500">({s.count})</span></span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900/[0.06]">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="border-violet-400/25 p-6">
                <h2 className="section-title">🤖 AI-written insights for officials</h2>
                <ul className="mt-4 space-y-3">
                  {insights.insights.map((i, idx) => (
                    <li key={idx} className="glass-soft p-4 text-sm leading-relaxed text-slate-700">• {i}</li>
                  ))}
                </ul>
              </GlassCard>
            </>
          )}
        </div>
      )}

      {tab === "consent" && (
        <div className="space-y-5">
          {!consent ? <Spinner label="Loading consent data…" /> : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiTile label="Total trainees" value={consent.total} />
                <KpiTile label="Tracking consent" value={`${Math.round((consent.tracking / Math.max(1, consent.total)) * 100)}%`} sub={`${consent.tracking} trainees`} />
                <KpiTile label="Recruiter-visible" value={consent.recruiterVisible} sub="opted into talent search" />
              </div>
              <GlassCard className="p-6">
                <h2 className="section-title">🔒 Consent audit log <span className="text-xs font-normal text-slate-500">(immutable)</span></h2>
                <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                  {consent.logs.map((l) => (
                    <div key={l.id} className="glass-soft flex flex-wrap items-center gap-3 p-3 text-sm">
                      <Chip tone={l.action.includes("revok") || l.action === "deletion-request" ? "pink" : "green"}>{l.action}</Chip>
                      <span className="font-semibold">{l.trainee.name}</span>
                      <span className="text-xs text-slate-500">{l.detail}</span>
                      <span className="ml-auto text-[11px] text-slate-500">{new Date(l.createdAt).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
