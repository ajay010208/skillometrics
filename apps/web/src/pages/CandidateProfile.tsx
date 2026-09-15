import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { GlassCard, Chip, ProgressBar, Spinner, EmptyState } from "../components/ui";

interface Candidate {
  id: string;
  name: string;
  state: string;
  district: string;
  education: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  targetRole: string | null;
  skills: Array<{ name: string; level: number; source: string; validated: boolean }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    repoUrl: string | null;
    liveUrl: string | null;
    evaluation: Array<{ verdict: string; feedback: string; name?: string }> | null;
  }>;
  assessments: Array<{ skillId: string; score: number; takenAt: string }>;
  educationHistory: Array<{ course: string; provider: string; cohort: string; status: string }>;
  placements: Array<{ employer: string; jobTitle: string; joiningDate: string }>;
}

export default function CandidateProfile() {
  const { id } = useParams();
  const [c, setC] = useState<Candidate | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Candidate>(`/recruiter/candidate/${id}`)
      .then(setC)
      .catch((e) => setErr(e instanceof Error ? e.message : "Not found"));
  }, [id]);

  if (err) return <EmptyState icon="🔒" title="Candidate not visible" hint={err} />;
  if (!c) return <Spinner label="Loading candidate…" />;

  const sourceChip = (source: string) =>
    source === "assessment" ? <Chip tone="violet">AI-assessed</Chip>
    : source === "project" ? <Chip tone="green">project-validated</Chip>
    : <Chip>resume</Chip>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/recruiter" className="btn-ghost text-xs">← Back to search</Link>

      {/* header */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 text-2xl font-black">
            {c.name.slice(0, 1)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black">{c.name}</h1>
            <div className="text-sm text-slate-500">
              🎯 {c.targetRole ?? "—"} · 📍 {c.district}, {c.state} · 🎓 {c.education ?? "—"}
            </div>
          </div>
          <div className="flex gap-2">
            {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="btn-secondary !px-3 !py-2 text-xs font-bold text-[#4da3f0]">in LinkedIn</a>}
            {c.githubUrl && <a href={c.githubUrl} target="_blank" rel="noreferrer" className="btn-secondary !px-3 !py-2 text-xs">⌂ GitHub</a>}
            {c.portfolioUrl && <a href={c.portfolioUrl} target="_blank" rel="noreferrer" className="btn-secondary !px-3 !py-2 text-xs">🌐 Portfolio</a>}
          </div>
        </div>
        {(c.email || c.phone) && (
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            {c.email && <span>✉️ {c.email}</span>}
            {c.phone && <span>📞 {c.phone}</span>}
          </div>
        )}
      </GlassCard>

      {/* validated skills */}
      <GlassCard className="p-6">
        <h2 className="section-title">✓ Skills <span className="text-xs font-normal text-slate-500">(validation method shown)</span></h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {c.skills.map((s) => (
            <div key={s.name} className="glass-soft p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{s.name}</span>
                <div className="flex items-center gap-2">
                  {sourceChip(s.source)}
                  <span className={`text-sm font-bold ${s.level >= 70 ? "text-emerald-600" : s.level >= 45 ? "text-amber-600" : "text-slate-500"}`}>{s.level}%</span>
                </div>
              </div>
              <div className="mt-2"><ProgressBar value={s.level} tone={s.validated ? "green" : "cyan"} /></div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* projects */}
      <GlassCard className="p-6">
        <h2 className="section-title">📦 Projects <span className="text-xs font-normal text-slate-500">(GitHub + AI evaluation verdicts)</span></h2>
        {c.projects.length === 0 && <div className="mt-3 text-sm text-slate-500">No projects submitted yet.</div>}
        <div className="mt-4 space-y-4">
          {c.projects.map((p) => (
            <div key={p.id} className="glass-soft p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{p.title}</span>
                {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-600 underline">⌂ repo</a>}
                {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-600 underline">🌐 live</a>}
              </div>
              <p className="mt-2 text-sm italic text-slate-500">“{p.description}”</p>
              {p.evaluation && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.evaluation.map((e, i) => (
                    <span key={i} title={e.feedback}>
                      <Chip tone={e.verdict === "validated" ? "green" : "amber"}>
                        {e.verdict === "validated" ? "✓" : "⚠"} {e.name ?? "skill"}
                      </Chip>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* training history */}
      {c.educationHistory.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="section-title">🎓 Training history</h2>
          <div className="mt-3 space-y-2">
            {c.educationHistory.map((e, i) => (
              <div key={i} className="glass-soft flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="font-semibold">{e.course}</span>
                <span className="text-slate-500">{e.provider}</span>
                <Chip>{e.cohort}</Chip>
                <span className="ml-auto text-xs text-slate-500">{e.status}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {c.placements.length > 0 && (
        <GlassCard className="border-emerald-400/25 p-6">
          <h2 className="section-title">🏆 Placement history</h2>
          {c.placements.map((p, i) => (
            <div key={i} className="mt-2 text-sm">
              <b>{p.jobTitle}</b> @ {p.employer} — since {new Date(p.joiningDate).toLocaleDateString("en-IN")}
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
