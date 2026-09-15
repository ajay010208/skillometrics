import { useEffect, useState } from "react";
import { api } from "../api";
import { GlassCard, Chip, Spinner, EmptyState, SourceBadge } from "../components/ui";

interface EvalItem {
  skillId: string;
  verdict: string;
  feedback: string;
  name?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  repoUrl: string | null;
  liveUrl: string | null;
  evaluation: string | null;
  createdAt: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [skills, setSkills] = useState<Array<{ skillId: string; skill: { name: string } }>>([]);
  const [form, setForm] = useState({ title: "", description: "", repoUrl: "", liveUrl: "" });
  const [busy, setBusy] = useState(false);
  const [justEvaluated, setJustEvaluated] = useState<EvalItem[] | null>(null);

  const load = async () => {
    try {
      const [p, s] = await Promise.all([
        api<Project[]>("/projects"),
        api<Array<{ skillId: string; skill: { name: string } }>>("/trainees/me/skills"),
      ]);
      setProjects(p);
      setSkills(s);
    } catch {
      setProjects([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.title || !form.description) return;
    setBusy(true);
    try {
      const created = await api<Project & { evaluation: string | null }>("/projects", {
        method: "POST",
        body: form,
      });
      setForm({ title: "", description: "", repoUrl: "", liveUrl: "" });
      const nameById = new Map(skills.map((s) => [s.skillId, s.skill.name]));
      const ev = created.evaluation ? (JSON.parse(created.evaluation) as EvalItem[]) : null;
      if (ev) setJustEvaluated(ev.map((e) => ({ ...e, name: nameById.get(e.skillId) ?? e.skillId })));
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Submit failed");
    }
    setBusy(false);
  };

  if (projects === null) return <Spinner label="Loading projects…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Project-Based Validation</h1>
        <p className="text-sm text-slate-500">
          Real projects beat resumes. Submit your work — AI evaluates which skills it proves.
        </p>
      </div>

      {justEvaluated && (
        <GlassCard className="border-emerald-400/30 p-5 animate-fade-up">
          <div className="font-bold text-emerald-600">✓ AI evaluation complete</div>
          <div className="mt-3 space-y-2">
            {justEvaluated.map((e, i) => (
              <div key={i} className="glass-soft flex items-start gap-3 p-3 text-sm">
                <Chip tone={e.verdict === "validated" ? "green" : "amber"}>
                  {e.verdict === "validated" ? "✓ validated" : "⚠ needs improvement"}
                </Chip>
                <div>
                  <b>{e.name}</b> — {e.feedback}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
        <GlassCard className="space-y-3 p-5">
          <h2 className="section-title">＋ Submit a project</h2>
          <input className="glass-input w-full" placeholder="Project title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="glass-input min-h-[110px] w-full" placeholder="What does it do? What techniques/skills did you use? Include datasets, stack, outcomes…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="glass-input w-full" placeholder="GitHub repo URL (optional)" value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} />
          <input className="glass-input w-full" placeholder="Live demo URL (optional)" value={form.liveUrl} onChange={(e) => setForm({ ...form, liveUrl: e.target.value })} />
          <button className="btn-primary w-full justify-center" onClick={submit} disabled={busy || !form.title || !form.description}>
            {busy ? "AI evaluating…" : "Submit for AI validation →"}
          </button>
          <p className="text-[11px] text-slate-500">
            Validated skills get a ✓ and lift your readiness. Recruiters see these projects with your GitHub link.
          </p>
        </GlassCard>

        <div className="space-y-4">
          {projects.length === 0 && (
            <EmptyState icon="📦" title="No projects yet" hint="Even a small dashboard or CLI tool counts — submit anything real you've built." />
          )}
          {projects.map((p) => {
            const nameById = new Map(skills.map((s) => [s.skillId, s.skill.name]));
            const ev: EvalItem[] | null = p.evaluation ? JSON.parse(p.evaluation) : null;
            return (
              <GlassCard key={p.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-bold">{p.title}</div>
                  {p.repoUrl && <a className="text-xs text-amber-600 underline" href={p.repoUrl} target="_blank" rel="noreferrer">⌂ GitHub</a>}
                  {p.liveUrl && <a className="text-xs text-amber-600 underline" href={p.liveUrl} target="_blank" rel="noreferrer">🌐 Live</a>}
                  <span className="ml-auto text-[11px] text-slate-500">{new Date(p.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
                <p className="mt-2 text-sm italic text-slate-500">“{p.description}”</p>
                {ev && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ev.map((e, i) => (
                      <span key={i} title={e.feedback}>
                        <Chip tone={e.verdict === "validated" ? "green" : "amber"}>
                          {e.verdict === "validated" ? "✓" : "⚠"} {nameById.get(e.skillId) ?? e.skillId}
                        </Chip>
                      </span>
                    ))}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
