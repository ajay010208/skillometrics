import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { GlassCard, Chip, ProgressBar, Spinner, EmptyState } from "../components/ui";

interface Candidate {
  id: string;
  name: string;
  state: string;
  district: string;
  education: string | null;
  targetRole: string | null;
  readiness: number;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  topSkills: Array<{ name: string; level: number; validated: boolean }>;
  projectCount: number;
  assessmentValidated: number;
  course: string | null;
}

export default function RecruiterSearch() {
  const [rows, setRows] = useState<Candidate[] | null>(null);
  const [skill, setSkill] = useState("");
  const [state, setState] = useState("");
  const [q, setQ] = useState("");
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());

  const load = async () => {
    const params = new URLSearchParams();
    if (skill) params.set("skill", skill);
    if (state) params.set("state", state);
    if (q) params.set("q", q);
    const r = await api<Candidate[]>(`/recruiter/search?${params}`);
    setRows(r);
  };

  useEffect(() => {
    load().catch(() => setRows([]));
  }, []);

  const shortlist = async (traineeId: string) => {
    await api("/recruiter/shortlist", { method: "POST", body: { traineeId } }).catch(() => {});
    setShortlisted((s) => new Set([...s, traineeId]));
  };

  if (rows === null) return <Spinner label="Searching talent…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Talent Search</h1>
        <p className="text-sm text-slate-500">
          Every candidate here has opted in. Skills marked ✓ are AI-validated via assessments or projects — not just resume claims.
        </p>
      </div>

      <GlassCard className="flex flex-wrap gap-3 p-4">
        <input className="glass-input flex-1 min-w-[180px]" placeholder="Search name / role / project…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <input className="glass-input w-44" placeholder="Skill (e.g. SQL)" value={skill} onChange={(e) => setSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <select className="glass-input w-44" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">All states</option>
          {["Maharashtra","Uttar Pradesh","Bihar","Tamil Nadu","Karnataka","West Bengal","Rajasthan","Madhya Pradesh","Telangana","Gujarat","Odisha","Kerala"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn-primary" onClick={load}>🔍 Search</button>
      </GlassCard>

      {rows.length === 0 && <EmptyState icon="🔍" title="No candidates found" hint="Try clearing filters." />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => (
          <GlassCard key={c.id} className="flex flex-col p-5" hover>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-500">🎯 {c.targetRole ?? "—"} · 📍 {c.district}, {c.state}</div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-black ${(c.readiness ?? 0) >= 70 ? "text-emerald-600" : (c.readiness ?? 0) >= 45 ? "text-amber-600" : "text-slate-500"}`}>
                  {c.readiness}%
                </div>
                <div className="text-[10px] uppercase text-slate-500">readiness</div>
              </div>
            </div>

            <div className="mt-3"><ProgressBar value={c.readiness} tone={c.readiness >= 70 ? "green" : "cyan"} /></div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.topSkills.slice(0, 5).map((s) => (
                <span key={s.name} title={`${s.level}%`}>
                  <Chip tone={s.validated ? "green" : "slate"}>
                    {s.validated ? "✓ " : ""}{s.name} {s.level}%
                  </Chip>
                </span>
              ))}
            </div>

            <div className="mt-3 flex gap-3 text-[11px] text-slate-500">
              <span>📦 {c.projectCount} project{c.projectCount !== 1 ? "s" : ""}</span>
              <span>✓ {c.assessmentValidated} validated skills</span>
              {c.course && <span>🎓 {c.course}</span>}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3">
              {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="btn-ghost !px-2 !py-1 text-xs font-bold text-[#4da3f0]">in</a>}
              {c.githubUrl && <a href={c.githubUrl} target="_blank" rel="noreferrer" className="btn-ghost !px-2 !py-1 text-xs">⌂</a>}
              {c.portfolioUrl && <a href={c.portfolioUrl} target="_blank" rel="noreferrer" className="btn-ghost !px-2 !py-1 text-xs">🌐</a>}
              <Link to={`/recruiter/candidate/${c.id}`} className="btn-ghost ml-auto text-xs font-semibold text-amber-600">
                View projects →
              </Link>
              <button
                className={`!py-1.5 text-xs font-bold rounded-lg px-3 ${shortlisted.has(c.id) ? "bg-emerald-500/15 text-emerald-600" : "btn-primary !px-3"}`}
                onClick={() => shortlist(c.id)}
                disabled={shortlisted.has(c.id)}
              >
                {shortlisted.has(c.id) ? "✓ Shortlisted" : "＋ Shortlist"}
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
