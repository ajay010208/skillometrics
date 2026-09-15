import { useEffect, useState } from "react";
import { api } from "../api";
import { useSession } from "../state";
import { GlassCard, Chip, Spinner } from "../components/ui";
import { SearchSelect } from "../components/SearchSelect";

interface Trainee {
  id: string;
  name: string;
  phone: string | null;
  state: string;
  district: string;
  age: number | null;
  gender: string | null;
  category: string | null;
  education: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  weeklyHours: number;
  consentTracking: boolean;
  consentRecruiterVisible: boolean;
  targetJob?: { title: string } | null;
  skills: Array<{ skillId: string; skill: { name: string }; level: number; source: string }>;
}

const TARGET_JOBS = [
  "Data Analyst", "Frontend Developer", "Backend Developer",
  "Digital Marketing Executive", "Accountant (Tally)", "Junior Welder", "Electrician",
];
const EDUCATIONS = ["12th pass", "Diploma", "ITI Certificate", "B.Com", "B.Sc", "B.A.", "B.Tech", "MCA", "MBA"];
const STATES = ["Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal"];

export default function Profile() {
  const { refresh } = useSession();
  const [t, setT] = useState<Trainee | null>(null);
  const [form, setForm] = useState<Partial<Trainee> & { targetJobTitle?: string }>({});
  const [skills, setSkills] = useState<Array<{ name: string; level: number }>>([]);
  const [newSkill, setNewSkill] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ trainee: Trainee | null }>("/auth/me")
      .then((r) => {
        setT(r.trainee);
        if (r.trainee) {
          setForm(r.trainee);
          setSkills(r.trainee.skills.map((s) => ({ name: s.skill.name, level: s.level })));
        }
      })
      .catch(() => setT(null));
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await api("/trainees/me", {
        method: "PATCH",
        body: { ...form, targetJobTitle: form.targetJobTitle, skills },
      });
      // skills go through the onboard endpoint (same upsert path)
      await api("/trainees/onboard", {
        method: "POST",
        body: { skills, state: form.state, district: form.district },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    }
    setBusy(false);
  };

  const statesFor = async (q: string) => {
    const needle = q.trim().toLowerCase();
    return STATES.filter((s) => !needle || s.toLowerCase().includes(needle)).map((label) => ({ label }));
  };
  const districtsFor = async (q: string) => {
    if (!form.state) return [];
    const list = await api<string[]>(`/locations/districts?state=${encodeURIComponent(form.state)}`).catch(() => []);
    const needle = q.trim().toLowerCase();
    return (list as string[]).filter((d) => !needle || d.toLowerCase().includes(needle)).map((label) => ({ label }));
  };

  const addSkill = (name: string) => {
    const clean = name.trim();
    if (!clean || skills.some((s) => s.name.toLowerCase() === clean.toLowerCase())) return;
    setSkills((s) => [...s, { name: clean, level: 40 }]);
    setNewSkill("");
  };

  if (!t) return <Spinner label="Loading profile…" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black">My Profile</h1>
        <p className="text-sm text-slate-500">Update any onboarding detail — changes persist and recompute your analysis.</p>
      </div>

      <GlassCard className="space-y-4 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 text-2xl font-black">
            {(form.name ?? t.name).slice(0, 1)}
          </div>
          <div>
            <div className="text-xl font-bold">{form.name ?? t.name}</div>
            <div className="text-sm text-slate-500">
              🎯 {form.targetJobTitle ?? t.targetJob?.title ?? "No target job"} · 📍 {form.district || t.district}, {form.state || t.state}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Name</span>
            <input className="glass-input w-full" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Phone</span>
            <input className="glass-input w-full" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <div className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">State</span>
            <SearchSelect
              value={form.state ?? ""}
              onSelect={(v) => setForm({ ...form, state: v, district: "" })}
              getOptions={statesFor}
              placeholder="Search states…"
            />
          </div>
          <div className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">City / District</span>
            <SearchSelect
              value={form.district ?? ""}
              onSelect={(v) => setForm({ ...form, district: v })}
              getOptions={districtsFor}
              placeholder={form.state ? `Cities in ${form.state}…` : "Pick a state first"}
            />
          </div>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Education</span>
            <select className="glass-input w-full" value={form.education ?? ""} onChange={(e) => setForm({ ...form, education: e.target.value })}>
              {EDUCATIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Target job</span>
            <select className="glass-input w-full" value={form.targetJobTitle ?? ""} onChange={(e) => setForm({ ...form, targetJobTitle: e.target.value })}>
              <option value="">No target job</option>
              {TARGET_JOBS.map((j) => <option key={j}>{j}</option>)}
            </select>
          </label>
        </div>

        {/* skills */}
        <div className="text-sm">
          <span className="mb-2 block font-semibold text-slate-600">Skills</span>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <button key={s.name} type="button" onClick={() => setSkills(skills.filter((x) => x.name !== s.name))} className="group">
                <Chip tone={s.level >= 60 ? "green" : "cyan"}>
                  {s.name} · {s.level}%<span className="ml-1 text-slate-500 group-hover:text-rose-300">✕</span>
                </Chip>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input className="glass-input flex-1" placeholder="Add skill + Enter" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(newSkill))} />
            <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => addSkill(newSkill)}>＋ Add</button>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-600">Weekly study hours: {form.weeklyHours ?? t.weeklyHours}h</span>
          <input
            type="range" min={5} max={25} step={5}
            value={form.weeklyHours ?? t.weeklyHours}
            onChange={(e) => setForm({ ...form, weeklyHours: Number(e.target.value) })}
            className="w-full accent-cyan-400"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-500">
            <span className="mb-1 block font-semibold text-sm text-slate-600"><span className="text-[#0A66C2]">in</span> LinkedIn</span>
            <input className="glass-input w-full" value={form.linkedinUrl ?? ""} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block font-semibold text-sm text-slate-600">⌂ GitHub</span>
            <input className="glass-input w-full" value={form.githubUrl ?? ""} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block font-semibold text-sm text-slate-600">🌐 Portfolio</span>
            <input className="glass-input w-full" value={form.portfolioUrl ?? ""} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} />
          </label>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-xl bg-slate-900/5 p-4 text-sm">
            <input
              type="checkbox"
              checked={form.consentRecruiterVisible ?? false}
              onChange={(e) => setForm({ ...form, consentRecruiterVisible: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-cyan-400"
            />
            <span className="text-slate-600">
              <b className="text-slate-900">Visible to recruiters</b> — appear in talent search with validated skills, projects, GitHub/LinkedIn.
              <Chip tone="cyan">consent-gated</Chip>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-slate-900/5 p-4 text-sm">
            <input
              type="checkbox"
              checked={form.consentTracking ?? true}
              onChange={(e) => setForm({ ...form, consentTracking: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-cyan-400"
            />
            <span className="text-slate-600">
              <b className="text-slate-900">Outcome tracking consent</b> — 3/6/12-month follow-ups + anonymous impact statistics.
            </span>
          </label>
        </div>

        <button className="btn-primary w-full justify-center" onClick={save} disabled={busy}>
          {busy ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
        </button>
      </GlassCard>

      <GlassCard className="p-5 text-xs text-slate-500">
        🔒 Every consent change is written to an immutable audit log. Editing your target job or skills recomputes your
        Reality Check and roadmap on the next visit.
      </GlassCard>
    </div>
  );
}
