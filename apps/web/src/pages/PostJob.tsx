import { useEffect, useState } from "react";
import { api } from "../api";
import { GlassCard, Chip, Spinner } from "../components/ui";

interface MyJob {
  id: string;
  title: string;
  state: string;
  district: string;
  salaryMin: number;
  salaryMax: number;
  postedAt: string;
  shortlists: unknown[];
}

const POPULAR_SKILLS = ["SQL", "Python", "JavaScript", "React", "Node.js", "Power BI", "Excel", "Digital Marketing", "Tally", "Communication", "Welding", "Electrician Skills"];

export default function PostJob() {
  const [jobs, setJobs] = useState<MyJob[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    title: "",
    state: "Maharashtra",
    district: "Pune",
    salaryMin: 25000,
    salaryMax: 40000,
    description: "",
  });
  const [skills, setSkills] = useState<Array<{ name: string; weight: number; minLevel: number }>>([
    { name: "SQL", weight: 3, minLevel: 60 },
  ]);

  const load = async () => {
    try {
      setJobs(await api<MyJob[]>("/recruiter/jobs"));
    } catch {
      setJobs([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      await api("/recruiter/jobs", {
        method: "POST",
        body: { ...form, salaryMin: Number(form.salaryMin), salaryMax: Number(form.salaryMax), skills },
      });
      setDone(true);
      setTimeout(() => setDone(false), 3000);
      setForm({ ...form, title: "", description: "" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Post failed");
    }
    setBusy(false);
  };

  if (jobs === null) return <Spinner label="Loading your jobs…" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <GlassCard className="space-y-3 p-6">
        <h1 className="text-xl font-black">Post a Job</h1>
        <p className="text-xs text-slate-500">Goes live instantly and enters every trainee's match engine.</p>
        <input className="glass-input w-full" placeholder="Job title (e.g. Junior Data Analyst)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <select className="glass-input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, district: "" })}>
            {["Maharashtra","Uttar Pradesh","Bihar","Tamil Nadu","Karnataka","West Bengal","Rajasthan","Madhya Pradesh","Telangana","Gujarat","Odisha","Kerala"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className="glass-input" placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-500">Salary min (₹)
            <input type="number" className="glass-input mt-1 w-full" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: Number(e.target.value) })} />
          </label>
          <label className="text-xs text-slate-500">Salary max (₹)
            <input type="number" className="glass-input mt-1 w-full" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: Number(e.target.value) })} />
          </label>
        </div>
        <textarea className="glass-input w-full" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <div>
          <div className="mb-2 text-xs font-semibold text-slate-600">Required skills</div>
          <div className="space-y-2">
            {skills.map((s, i) => (
              <div key={i} className="glass-soft flex items-center gap-2 p-2.5 text-xs">
                <select
                  className="glass-input !px-2 !py-1 flex-1"
                  value={s.name}
                  onChange={(e) => setSkills(skills.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))}
                >
                  {POPULAR_SKILLS.map((p) => <option key={p}>{p}</option>)}
                </select>
                <label className="text-[10px] text-slate-500">
                  min
                  <input
                    type="number" min={10} max={100}
                    className="glass-input !px-2 !py-1 ml-1 w-16"
                    value={s.minLevel}
                    onChange={(e) => setSkills(skills.map((x, xi) => (xi === i ? { ...x, minLevel: Number(e.target.value) } : x)))}
                  />
                </label>
                <button className="text-rose-300 hover:text-rose-200" onClick={() => setSkills(skills.filter((_, xi) => xi !== i))}>✕</button>
              </div>
            ))}
          </div>
          <button
            className="btn-ghost mt-2 text-xs"
            onClick={() => setSkills([...skills, { name: "SQL", weight: 3, minLevel: 60 }])}
          >
            ＋ Add skill requirement
          </button>
        </div>

        <button className="btn-primary w-full justify-center" onClick={submit} disabled={busy || !form.title || !form.district}>
          {busy ? "Posting…" : done ? "✓ Live!" : "🚀 Post job"}
        </button>
      </GlassCard>

      <div className="space-y-3">
        <h2 className="section-title">Your live jobs</h2>
        {jobs.length === 0 && <div className="text-sm text-slate-500">No jobs posted yet.</div>}
        {jobs.map((j) => (
          <GlassCard key={j.id} className="flex flex-wrap items-center gap-3 p-4">
            <div>
              <div className="font-bold">{j.title}</div>
              <div className="text-xs text-slate-500">📍 {j.district}, {j.state} · ₹{j.salaryMin.toLocaleString("en-IN")}–{j.salaryMax.toLocaleString("en-IN")}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Chip tone="cyan">{j.shortlists.length} in pipeline</Chip>
              <span className="text-[11px] text-slate-500">{new Date(j.postedAt).toLocaleDateString("en-IN")}</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
