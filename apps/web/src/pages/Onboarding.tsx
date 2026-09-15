import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { GlassCard, Chip } from "../components/ui";
import { SearchSelect } from "../components/SearchSelect";

const TARGET_JOBS = [
  "Data Analyst", "Frontend Developer", "Backend Developer",
  "Digital Marketing Executive", "Accountant (Tally)", "Junior Welder", "Electrician",
];
const POPULAR_SKILLS = [
  "SQL", "Python", "Statistics", "Power BI", "Excel", "JavaScript", "React", "Node.js",
  "Java", "Machine Learning", "Digital Marketing", "Tally", "Communication", "Aptitude", "Welding", "Electrician Skills",
];
const EDUCATIONS = ["12th pass", "Diploma", "ITI Certificate", "B.Com", "B.Sc", "B.A.", "B.Tech", "MCA", "MBA"];

export default function Onboarding() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"job" | "resume">("job");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    state: "Maharashtra",
    district: "Pune",
    age: "",
    gender: "Female",
    category: "General",
    education: "B.Sc",
    weeklyHours: 10,
    targetJobTitle: "Data Analyst",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    consentTracking: true,
  });
  const [skills, setSkills] = useState<Array<{ name: string; level: number }>>([
    { name: "SQL", level: 40 },
  ]);
  const [newSkill, setNewSkill] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from existing profile so edits persist across sessions.
  useEffect(() => {
    api<{ trainee: null | { name: string; state: string; district: string; education: string | null; linkedinUrl: string | null; githubUrl: string | null; portfolioUrl: string | null; weeklyHours: number; skills: Array<{ skill: { name: string }; level: number }>; targetJob?: { title: string } | null } }>("/auth/me")
      .then((r) => {
        const t = r.trainee;
        if (!t) return;
        setForm((f) => ({
          ...f,
          name: t.name || f.name,
          state: t.state || f.state,
          district: t.district || f.district,
          education: t.education ?? f.education,
          linkedinUrl: t.linkedinUrl ?? "",
          githubUrl: t.githubUrl ?? "",
          portfolioUrl: t.portfolioUrl ?? "",
          weeklyHours: t.weeklyHours || 10,
          targetJobTitle: t.targetJob?.title ?? f.targetJobTitle,
        }));
        if (t.skills?.length) {
          setSkills(t.skills.map((s) => ({ name: s.skill.name, level: s.level })));
        }
      })
      .catch(() => {});
  }, []);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const districtsForState = useMemo(
    () => async (q: string) => {
      const list = (await api<string[]>(`/locations/districts?state=${encodeURIComponent(form.state)}`).catch(() => [])) as string[];
      const needle = q.trim().toLowerCase();
      return list
        .filter((d) => !needle || d.toLowerCase().includes(needle))
        .map((label) => ({ label }));
    },
    [form.state]
  );

  const statesFor = useMemo(
    () => async (q: string) => {
      const hits = (await api<Array<{ state: string; districts: string[] }>>(`/locations/states?q=${encodeURIComponent(q)}`).catch(() => [])) as Array<{ state: string; districts: string[] }>;
      return hits.map((h) => ({ label: h.state, sub: h.districts }));
    },
    []
  );

  const addSkill = (name: string) => {
    const clean = name.trim();
    if (!clean || skills.some((s) => s.name.toLowerCase() === clean.toLowerCase())) return;
    setSkills((s) => [...s, { name: clean, level: 40 }]);
    setNewSkill("");
  };

  const readFile = async (file: File) => {
    setResumeFileName(file.name);
    const text = await file.text().catch(() => "");
    const printable = text.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
    setResumeText(printable.length > 80 ? printable : text);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { ...form, age: form.age ? Number(form.age) : undefined, skills };
      if (mode === "resume" && resumeText) {
        body.resumeText = resumeText;
        body.resumeFileName = resumeFileName || "resume.txt";
      }
      await api("/trainees/onboard", { method: "POST", body });
      navigate("/skill-analysis");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onboarding failed");
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="text-center">
        <h1 className="text-3xl font-black">Build your career profile</h1>
        <p className="mt-2 text-slate-500">
          Saved to your account — come back anytime and pick up where you left off.
        </p>
      </div>

      <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3">
        <button onClick={() => setMode("job")} className={`glass p-4 text-left ${mode === "job" ? "!border-cyan-400/60 ring-2 ring-cyan-400/30" : ""}`}>
          <div className="text-2xl">🎯</div>
          <div className="mt-1 font-bold">Target Job</div>
          <div className="text-xs text-slate-500">I know what I want</div>
        </button>
        <button onClick={() => setMode("resume")} className={`glass p-4 text-left ${mode === "resume" ? "!border-violet-400/60 ring-2 ring-violet-400/30" : ""}`}>
          <div className="text-2xl">📄</div>
          <div className="mt-1 font-bold">Resume Upload</div>
          <div className="text-xs text-slate-500">Extract my skills</div>
        </button>
      </div>

      <GlassCard className="mt-6 space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Full name</span>
            <input className="glass-input w-full" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Phone</span>
            <input className="glass-input w-full" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit mobile" />
          </label>

          {/* searchable state dropdown: type "gu" → Gujarat */}
          <div className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">State <span className="text-[10px] font-normal text-slate-500">(type to search — "gu" → Gujarat)</span></span>
            <SearchSelect
              value={form.state}
              onSelect={(v) => {
                set("state", v);
                set("district", "");
              }}
              getOptions={statesFor}
              placeholder="Search states…"
            />
          </div>
          {/* city/district suggestions follow the selected state */}
          <div className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">City / District</span>
            <SearchSelect
              value={form.district}
              onSelect={(v) => set("district", v)}
              getOptions={districtsForState}
              placeholder={form.state ? `Cities in ${form.state}…` : "Pick a state first"}
            />
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Education</span>
            <select className="glass-input w-full" value={form.education} onChange={(e) => set("education", e.target.value)}>
              {EDUCATIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Weekly study hours: {form.weeklyHours}h</span>
            <input type="range" min={5} max={25} step={5} value={form.weeklyHours} onChange={(e) => set("weeklyHours", Number(e.target.value))} className="mt-3 w-full accent-cyan-400" />
          </label>
        </div>

        {/* skills chips */}
        <div className="text-sm">
          <span className="mb-2 block font-semibold text-slate-600">Your skills <span className="text-[10px] font-normal text-slate-500">(click a chip to remove)</span></span>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSkills(skills.filter((x) => x.name !== s.name))}
                className="group"
                title="Remove"
              >
                <Chip tone="cyan">
                  {s.name} · {s.level}%<span className="ml-1 text-slate-500 group-hover:text-rose-300">✕</span>
                </Chip>
              </button>
            ))}
            {skills.length === 0 && <span className="text-xs text-slate-500">No skills yet — add a few below.</span>}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="glass-input flex-1"
              placeholder="Add a skill (e.g. SQL) and press Enter"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(newSkill))}
            />
            <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => addSkill(newSkill)}>＋ Add</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {POPULAR_SKILLS.filter((p) => !skills.some((s) => s.name === p)).slice(0, 10).map((p) => (
              <button key={p} type="button" onClick={() => addSkill(p)} className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-900/[0.08] hover:text-slate-900">
                ＋ {p}
              </button>
            ))}
          </div>
        </div>

        {mode === "job" ? (
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Target job</span>
            <select className="glass-input w-full" value={form.targetJobTitle} onChange={(e) => set("targetJobTitle", e.target.value)}>
              {TARGET_JOBS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Resume (txt / pdf)</span>
              <input type="file" accept=".txt,.pdf,.md" className="glass-input w-full file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900/[0.06] file:px-3 file:py-1.5 file:text-slate-900" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Or paste your resume text</span>
              <textarea className="glass-input min-h-[110px] w-full" value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste resume text here — skills, projects, experience…" />
            </label>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 flex items-center gap-1 font-semibold text-slate-600"><span className="text-[#0A66C2]">in</span> LinkedIn</span>
            <input className="glass-input w-full" value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} placeholder="linkedin.com/in/…" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">⌂ GitHub</span>
            <input className="glass-input w-full" value={form.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} placeholder="github.com/…" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">🌐 Portfolio</span>
            <input className="glass-input w-full" value={form.portfolioUrl} onChange={(e) => set("portfolioUrl", e.target.value)} placeholder="yourportfolio.dev" />
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-xl bg-slate-900/5 p-4 text-sm">
          <input type="checkbox" checked={form.consentTracking} onChange={(e) => set("consentTracking", e.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-400" />
          <span className="text-slate-600">
            I consent to outcome tracking (placement, salary progression, 3/6/12-month follow-ups) for impact measurement. Revoke anytime.
            <Chip tone="green">DPDP-style consent</Chip>
          </span>
        </label>

        {error && <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

        <button className="btn-primary w-full justify-center text-base" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : mode === "job" ? "Create My Roadmap →" : "Analyze My Resume →"}
        </button>
      </GlassCard>
    </div>
  );
}
