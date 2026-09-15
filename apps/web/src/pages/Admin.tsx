import { useEffect, useState } from "react";
import { api } from "../api";
import { GlassCard, Chip, KpiTile, Spinner, SourceBadge } from "../components/ui";

type Tab = "overview" | "jobs" | "resources" | "placements" | "followups" | "providers" | "audit";

interface Resource {
  id: string;
  title: string;
  platform: string;
  url: string;
  language: string;
  cost: string;
  durationHours: number;
  rating: number;
  skill: { name: string };
}

interface Placement {
  id: string;
  employer: string;
  jobTitle: string;
  monthlySalary: number;
  employerVerified: boolean;
  type: string;
  joiningDate: string;
  trainee: { name: string; state: string };
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<{ trainees: number; jobs: number; placements: number; resources: number } | null>(null);
  const [jobs, setJobs] = useState<Array<{ id: string; title: string; company: string; district: string; active: boolean }> | null>(null);
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [overdue, setOverdue] = useState<Array<{ id: string; milestone: number; dueAt: string; placement: { employer: string; trainee: { name: string; phone: string | null } } }> | null>(null);
  const [providers, setProviders] = useState<Array<{ id: string; name: string; state: string; type: string | null; courses: Array<{ id: string; name: string; enrollments: unknown[] }> }> | null>(null);
  const [audit, setAudit] = useState<Array<{ id: string; entity: string; action: string; detail: string | null; createdAt: string }> | null>(null);
  const [skills, setSkills] = useState<Array<{ id: string; name: string }> | null>(null);
  const [tickMsg, setTickMsg] = useState<string | null>(null);
  const [newRes, setNewRes] = useState({ skillId: "", title: "", platform: "YouTube", url: "", language: "English", cost: "free", durationHours: 10 });

  const loadAll = async () => {
    try {
      const [t, j, r, p, o, pv, a, s] = await Promise.all([
        api<{ trainees: unknown[] }>("/admin/trainees"),
        api<Array<{ id: string; title: string; company: string; district: string; active: boolean }>>("/admin/jobs"),
        api<Resource[]>("/admin/resources"),
        api<Placement[]>("/admin/placements"),
        api<Array<{ id: string; milestone: number; dueAt: string; placement: { employer: string; trainee: { name: string; phone: string | null } } }>>("/admin/followups/overdue"),
        api<Array<{ id: string; name: string; state: string; type: string | null; courses: Array<{ id: string; name: string; enrollments: unknown[] }> }>>("/admin/providers"),
        api<Array<{ id: string; entity: string; action: string; detail: string | null; createdAt: string }>>("/admin/audit"),
        api<Array<{ id: string; name: string }>>("/admin/skills"),
      ]);
      setStats({ trainees: (t.trainees as unknown[]).length, jobs: j.length, placements: p.length, resources: r.length });
      setJobs(j);
      setResources(r);
      setPlacements(p);
      setOverdue(o);
      setProviders(pv);
      setAudit(a);
      setSkills(s);
      setNewRes((n) => ({ ...n, skillId: n.skillId || s[0]?.id || "" }));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const runTick = async () => {
    const r = await api<{ processed: number }>("/admin/followups/tick", { method: "POST" }).catch(() => null);
    setTickMsg(r ? `Processed ${r.processed} due follow-ups (automated call → WhatsApp → assisted)` : "Tick failed");
    setTimeout(() => setTickMsg(null), 4000);
    loadAll();
  };

  const verify = async (id: string) => {
    await api(`/admin/placements/${id}/verify`, { method: "PATCH" });
    loadAll();
  };

  const retireJob = async (id: string) => {
    await api(`/admin/jobs/${id}`, { method: "DELETE" });
    loadAll();
  };

  const addResource = async () => {
    if (!newRes.title || !newRes.url || !newRes.skillId) return;
    await api("/admin/resources", { method: "POST", body: { ...newRes, durationHours: Number(newRes.durationHours) } });
    setNewRes({ ...newRes, title: "", url: "" });
    loadAll();
  };

  const deleteResource = async (id: string) => {
    await api(`/admin/resources/${id}`, { method: "DELETE" });
    loadAll();
  };

  if (!stats || !jobs || !resources || !placements || !overdue || !providers || !audit || !skills)
    return <Spinner label="Loading admin panel…" />;

  const tabs: Array<[Tab, string]> = [
    ["overview", "📊 Overview"],
    ["jobs", `💼 Jobs (${jobs.length})`],
    ["resources", `📚 Resources (${resources.length})`],
    ["placements", `🏆 Placements (${placements.length})`],
    ["followups", `📆 Follow-ups (${overdue.length} overdue)`],
    ["providers", `🏫 Providers (${providers.length})`],
    ["audit", "🧾 Audit log"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Admin Management Panel</h1>
        <p className="text-sm text-slate-500">Full platform administration — every edit is audit-logged.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold ${tab === key ? "bg-amber-500/15 text-amber-600" : "bg-slate-900/5 text-slate-500 hover:text-slate-900"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tickMsg && <div className="rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-600">{tickMsg}</div>}

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-4">
          <KpiTile label="Trainees" value={stats.trainees} />
          <KpiTile label="Jobs (active + retired)" value={stats.jobs} />
          <KpiTile label="Placements" value={stats.placements} />
          <KpiTile label="Learning resources" value={stats.resources} />
        </div>
      )}

      {tab === "jobs" && (
        <GlassCard className="overflow-x-auto p-6">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">District</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"></th></tr>
            </thead>
            <tbody>
              {jobs.slice(0, 60).map((j) => (
                <tr key={j.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-semibold">{j.title}</td>
                  <td className="px-3 py-2.5 text-slate-600">{j.company}</td>
                  <td className="px-3 py-2.5 text-slate-500">{j.district}</td>
                  <td className="px-3 py-2.5">{j.active ? <Chip tone="green">active</Chip> : <Chip>retired</Chip>}</td>
                  <td className="px-3 py-2.5 text-right">
                    {j.active &&            <button className="btn-ghost text-xs text-rose-400" onClick={() => retireJob(j.id)}>Retire</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {tab === "resources" && (
        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <GlassCard className="space-y-2.5 p-5">
            <h2 className="section-title">＋ Add resource</h2>
            <select className="glass-input w-full" value={newRes.skillId} onChange={(e) => setNewRes({ ...newRes, skillId: e.target.value })}>
              {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="glass-input w-full" placeholder="Title" value={newRes.title} onChange={(e) => setNewRes({ ...newRes, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="glass-input" value={newRes.platform} onChange={(e) => setNewRes({ ...newRes, platform: e.target.value })}>
                {["YouTube", "NPTEL", "SWAYAM", "freeCodeCamp", "Coursera", "Microsoft Learn", "Google", "GeeksforGeeks", "Khan Academy"].map((p) => <option key={p}>{p}</option>)}
              </select>
              <select className="glass-input" value={newRes.cost} onChange={(e) => setNewRes({ ...newRes, cost: e.target.value })}>
                {["free", "freemium", "paid"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <input className="glass-input w-full" placeholder="https://…" value={newRes.url} onChange={(e) => setNewRes({ ...newRes, url: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="glass-input" value={newRes.language} onChange={(e) => setNewRes({ ...newRes, language: e.target.value })}>
                {["English", "Hindi"].map((l) => <option key={l}>{l}</option>)}
              </select>
              <input className="glass-input" type="number" placeholder="Hours" value={newRes.durationHours} onChange={(e) => setNewRes({ ...newRes, durationHours: Number(e.target.value) })} />
            </div>
            <button className="btn-primary w-full justify-center" onClick={addResource} disabled={!newRes.title || !newRes.url}>Add to catalog</button>
          </GlassCard>

          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {resources.map((r) => (
              <GlassCard key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <Chip tone="cyan">{r.platform}</Chip>
                    <span>{r.skill.name}</span>
                    <span>· ⏱ {r.durationHours}h</span>
                    <span>· {r.language}</span>
                    <Chip tone={r.cost === "free" ? "green" : "amber"}>{r.cost}</Chip>
                  </div>
                </div>
                <a href={r.url} target="_blank" rel="noreferrer" className="btn-ghost text-[11px] text-amber-600">open ↗</a>
                <button className="btn-ghost text-[11px] text-rose-300" onClick={() => deleteResource(r.id)}>delete</button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {tab === "placements" && (
        <GlassCard className="overflow-x-auto p-6">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Trainee</th><th className="px-3 py-2">Employer</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Salary</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Verified</th><th className="px-3 py-2"></th></tr>
            </thead>
            <tbody>
              {placements.slice(0, 80).map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-semibold">{p.trainee.name}<div className="text-[11px] text-slate-500">{p.trainee.state}</div></td>
                  <td className="px-3 py-2.5">{p.employer}</td>
                  <td className="px-3 py-2.5 text-slate-600">{p.jobTitle}</td>
                  <td className="px-3 py-2.5">₹{p.monthlySalary.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2.5"><Chip tone={p.type === "job" ? "cyan" : "violet"}>{p.type}</Chip></td>
                  <td className="px-3 py-2.5">{p.employerVerified ? <Chip tone="green">✓</Chip> : <Chip tone="amber">pending</Chip>}</td>
                  <td className="px-3 py-2.5 text-right">
                    {!p.employerVerified && (
                      <button className="btn-ghost text-xs text-emerald-600" onClick={() => verify(p.id)}>Verify ✓</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {tab === "followups" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={runTick}>⚡ Run follow-up dispatch cycle</button>
            <span className="text-xs text-slate-500">Automated call → WhatsApp → assisted escalation, for overdue check-ins.</span>
          </div>
          {overdue.length === 0 && <div className="glass-soft p-4 text-sm text-slate-500">No overdue follow-ups 🎉</div>}
          {overdue.map((f) => (
            <GlassCard key={f.id} className="flex flex-wrap items-center gap-3 p-4">
              <Chip tone="amber">{f.milestone}-month due</Chip>
              <span className="font-semibold">{f.placement.trainee.name}</span>
              <span className="text-sm text-slate-500">@ {f.placement.employer}</span>
              <span className="text-xs text-slate-500">📞 {f.placement.trainee.phone ?? "—"}</span>
              <span className="ml-auto text-xs text-slate-500">due {new Date(f.dueAt).toLocaleDateString("en-IN")}</span>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === "providers" && (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((p) => (
            <GlassCard key={p.id} className="p-5">
              <div className="flex items-center gap-2">
                <span className="font-bold">{p.name}</span>
                <Chip tone="cyan">{p.type ?? "provider"}</Chip>
              </div>
              <div className="mt-1 text-xs text-slate-500">📍 {p.state} · {p.courses.length} courses · {p.courses.reduce((a, c) => a + c.enrollments.length, 0)} enrollments</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.courses.slice(0, 4).map((c) => <Chip key={c.id}>{c.name}</Chip>)}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === "audit" && (
        <GlassCard className="max-h-[70vh] overflow-y-auto p-6">
          <div className="space-y-2">
            {audit.map((a) => (
              <div key={a.id} className="glass-soft flex flex-wrap items-center gap-3 p-3 text-sm">
                <Chip tone="violet">{a.entity}</Chip>
                <span className="font-semibold">{a.action}</span>
                <span className="text-xs text-slate-500">{a.detail}</span>
                <span className="ml-auto text-[11px] text-slate-500">{new Date(a.createdAt).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
