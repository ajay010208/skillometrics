import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { GlassCard, Chip, ProgressBar, Spinner, EmptyState } from "../components/ui";

interface Skill {
  skillId: string;
  skill: { name: string; category: string };
  level: number;
  source: string;
}

export default function Assessments() {
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api<Skill[]>("/trainees/me/skills")
      .then(setSkills)
      .catch((e) => {
        setErr(e instanceof Error ? e.message : "Failed");
        setSkills([]);
      });
  }, []);

  const start = async (skillId: string) => {
    setStarting(skillId);
    try {
      const a = await api<{ id: string; skill: { name: string }; questions: Array<{ q: string; options: string[] }>; source?: string }>(
        "/assessments/start",
        { method: "POST", body: { skillId } }
      );
      sessionStorage.setItem(`quiz_${a.id}`, JSON.stringify(a));
      navigate(`/assessments/${a.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not start");
    }
    setStarting(null);
  };

  if (skills === null) return <Spinner label="Loading skills…" />;
  if (err) return <EmptyState icon="🧪" title="Assessments unavailable" hint={err} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">AI Assessments</h1>
        <p className="text-sm text-slate-500">
          Validate your skills — scores update your profile and Reality Check instantly.
        </p>
      </div>
      {skills.length === 0 ? (
        <EmptyState icon="🧪" title="No skills yet" hint="Complete onboarding first." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <GlassCard key={s.skillId} className="p-5" hover>
              <div className="flex items-center justify-between">
                <div className="font-bold">{s.skill.name}</div>
                <Chip tone={s.level >= 70 ? "green" : s.level >= 45 ? "amber" : "pink"}>{s.level}%</Chip>
              </div>
              <div className="mt-3"><ProgressBar value={s.level} tone={s.level >= 70 ? "green" : "cyan"} /></div>
              <div className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">
                Source: {s.source}
              </div>
              <button
                className="btn-primary mt-4 w-full justify-center !py-2 text-xs"
                onClick={() => start(s.skillId)}
                disabled={starting !== null}
              >
                {starting === s.skillId ? "Generating…" : "Take AI assessment →"}
              </button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
