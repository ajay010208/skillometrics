import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts";
import { api } from "../api";
import { GlassCard, Chip, ProgressBar, Spinner, EmptyState, SourceBadge } from "../components/ui";

interface Resource {
  id: string;
  title: string;
  platform: string;
  url: string;
  language: string;
  cost: string;
  durationHours: number;
  prerequisites: string[];
  rating: number;
  format: string;
}

interface SkillRow {
  skillId: string;
  name: string;
  category: string;
  level: number;
  minLevel: number;
  weight: number;
  gap: number;
  met: boolean;
  resources: Resource[];
}

interface Analysis {
  targetJob: { title: string; family: string };
  readiness: number;
  hireableToday: boolean;
  skills: SkillRow[];
  benchmark: Array<{ skillId: string; name: string; demandPct: number; traineeLevel: number }>;
  realityCheck: {
    requirementsMet: number;
    requirementsTotal: number;
    biggestGaps: string[];
    totalGapHours: number;
    weeklyHours: number;
    estimatedWeeks: number;
    etaDate: string;
    jobsAnalyzed: number;
    jobsInState: number;
  };
}

export default function SkillAnalysis() {
  const [data, setData] = useState<Analysis | null>(null);
  const [narrative, setNarrative] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const a = await api<Analysis>("/skill-analysis");
        setData(a);
        const gaps = a.skills.filter((s) => !s.met).sort((x, y) => y.gap - x.gap);
        setNarrative([
          gaps.length
            ? `Focus on ${gaps.slice(0, 2).map((g) => g.name).join(" and ")} first — they carry the most weight in ${a.targetJob.title} postings.`
            : "You meet every requirement — switch to the Jobs tab and start applying.",
          "Each recommended resource shows platform, cost, language and estimated hours.",
          "After finishing a resource, take the assessment — your readiness recalculates instantly.",
        ]);
        const rc = a.realityCheck;
        if (rc.requirementsMet === rc.requirementsTotal && a.readiness >= 70) {
          setVerdict([`Hireable today: YES — all ${rc.requirementsTotal} requirements met (${a.readiness}% readiness). Start applying now.`]);
        } else {
          setVerdict([
            `Hireable today: ${a.hireableToday ? "ALMOST" : "NOT YET"} — ${rc.requirementsMet}/${rc.requirementsTotal} requirements met (${a.readiness}% readiness).`,
            rc.biggestGaps.length ? `Biggest blockers: ${rc.biggestGaps.join(", ")}.` : "",
            `Timeline: ~${rc.estimatedWeeks} week(s) at ${rc.weeklyHours}h/week → employable by ${new Date(rc.etaDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}.`,
          ].filter(Boolean));
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner label="Analyzing your skills…" />;
  if (err || !data)
    return (
      <EmptyState
        icon="🎯"
        title="No skill analysis yet"
        hint={err ?? "Complete onboarding to pick a target job or upload your resume."}
      />
    );

  const rc = data.realityCheck;
  const radarData = data.skills.map((s) => ({
    skill: s.name,
    you: s.level,
    required: s.minLevel,
  }));

  return (
    <div className="space-y-6">
      {/* header + readiness */}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <GlassCard className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black">
              Skill Gap & Readiness — <span className="text-amber-600">{data.targetJob.title}</span>
            </h1>
            <Chip tone={data.readiness >= 70 ? "green" : data.readiness >= 45 ? "amber" : "pink"}>
              {data.readiness}% ready
            </Chip>
          </div>
          <div className="mt-4 h-3"><ProgressBar value={data.readiness} tone={data.readiness >= 70 ? "green" : "cyan"} /></div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="80%">
                <PolarGrid stroke="rgba(15,23,42,0.1)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="You" dataKey="you" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} />
                <Radar name="Required" dataKey="required" stroke="#fb923c" fill="#fb923c" fillOpacity={0.12} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Reality check */}
        <GlassCard className="border-amber-400/20 p-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            <h2 className="text-lg font-bold">Reality Check</h2>
            <Chip tone="amber">Honest mode</Chip>
          </div>
          <div className="mt-4 space-y-2.5">
            {verdict.map((v, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-700">{v}</p>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="glass-soft p-3 text-center">
              <div className="text-xl font-extrabold text-amber-600">{rc.requirementsMet}/{rc.requirementsTotal}</div>
              <div className="text-[11px] text-slate-500">requirements met</div>
            </div>
            <div className="glass-soft p-3 text-center">
              <div className="text-xl font-extrabold text-orange-600">~{rc.estimatedWeeks}w</div>
              <div className="text-[11px] text-slate-500">to employable</div>
            </div>
            <div className="glass-soft p-3 text-center">
              <div className="text-xl font-extrabold text-slate-900">{rc.totalGapHours}h</div>
              <div className="text-[11px] text-slate-500">focused learning left</div>
            </div>
            <div className="glass-soft p-3 text-center">
              <div className="text-xl font-extrabold text-slate-900">{rc.jobsAnalyzed}</div>
              <div className="text-[11px] text-slate-500">live jobs analyzed</div>
            </div>
          </div>
          <div className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Benchmark from {rc.jobsAnalyzed} live {data.targetJob.title} postings ({rc.jobsInState} in your state).
            Estimates assume {rc.weeklyHours}h/week — adjust in your profile.
          </div>
        </GlassCard>
      </div>

      {/* narrative */}
      <GlassCard className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600">
        <span className="font-bold text-slate-900">AI coach says:</span>
        {narrative.map((n, i) => <span key={i}>• {n}</span>)}
        <Link to="/roadmap" className="btn-primary ml-auto !py-1.5 text-xs">Open Roadmap →</Link>
      </GlassCard>

      {/* market demand chart */}
      <GlassCard className="p-6">
        <h2 className="section-title">📈 Market demand vs your level <span className="text-xs font-normal text-slate-500">(% of postings requiring the skill)</span></h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.benchmark.map((b) => ({ name: b.name, demand: b.demandPct, you: b.traineeLevel }))}>
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12 }} />
              <Bar dataKey="demand" fill="#fb923c" radius={[6, 6, 0, 0]} name="Market demand %" />
              <Bar dataKey="you" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Your level" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* per-skill breakdown + resources */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.skills.map((s) => (
          <GlassCard key={s.skillId} className="p-5">
            <div className="flex items-center justify-between">
              <div className="font-bold">{s.name}</div>
              <Chip tone={s.met ? "green" : s.gap > 30 ? "pink" : "amber"}>
                {s.met ? "✓ met" : `gap ${s.gap}`}
              </Chip>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span>You: <b className="text-amber-600">{s.level}</b></span>
              <span>Required: <b className="text-orange-600">{s.minLevel}</b></span>
              <span>Weight: {s.weight}× </span>
            </div>
            <div className="mt-2"><ProgressBar value={s.level} tone={s.met ? "green" : "pink"} /></div>

            {s.resources.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Recommended to close this gap</div>
                {s.resources.slice(0, 3).map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-soft glass-hover block px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">{r.title}</div>
                      <Chip tone={r.cost === "free" ? "green" : "amber"}>{r.cost}</Chip>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <Chip tone="cyan">{r.platform}</Chip>
                      <span>⏱ ~{r.durationHours}h</span>
                      <span>· {r.language}</span>
                      <span>· ★ {r.rating}</span>
                      {r.prerequisites.length > 0 && <span>· prereq: {r.prerequisites.join(", ")}</span>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
