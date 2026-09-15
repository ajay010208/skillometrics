import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { GlassCard, Chip, ProgressBar, Spinner, EmptyState, SourceBadge } from "../components/ui";

interface Item {
  id: string;
  status: string;
  order: number;
  estHours: number;
  targetWeeks: number;
  estCompletionDate: string | null;
  skill: { name: string };
  resource: {
    title: string;
    platform: string;
    url: string;
    language: string;
    cost: string;
    durationHours: number;
    prerequisites: string;
    rating: number;
  } | null;
}

export default function Roadmap() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: Item[]; weeklyHours: number }>("/roadmap");
      setItems(r.items);
      setWeeklyHours(r.weeklyHours);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load roadmap");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const build = async () => {
    setBusy(true);
    try {
      await api("/roadmap/build", { method: "POST", body: { weeklyHours } });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Build failed");
    }
    setBusy(false);
  };

  const advance = async (item: Item) => {
    const next = item.status === "pending" ? "in-progress" : item.status === "in-progress" ? "done" : "pending";
    setItems((cur) => cur?.map((i) => (i.id === item.id ? { ...i, status: next } : i)) ?? null);
    await api(`/roadmap/${item.id}`, { method: "PATCH", body: { status: next } }).catch(() => {});
  };

  if (items === null) return <Spinner label="Loading your roadmap…" />;
  if (err)
    return <EmptyState icon="🗺️" title="Roadmap unavailable" hint={err} />;

  const done = items.filter((i) => i.status === "done").length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Your Learning Roadmap</h1>
          <p className="text-sm text-slate-500">
            Real resources with honest duration estimates — built from your skill gaps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500">
            Pace
            <select
              className="glass-input ml-2 !py-1.5"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
            >
              {[5, 10, 15, 20, 25].map((h) => <option key={h} value={h}>{h}h/week</option>)}
            </select>
          </label>
          <button className="btn-primary" onClick={build} disabled={busy}>
            {busy ? "Building…" : "⚡ Rebuild from gaps"}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="No roadmap items yet"
          hint="Click “Rebuild from gaps” — we match every skill gap with the best free resource and a realistic time estimate."
        />
      ) : (
        <>
          <GlassCard className="flex items-center gap-4 p-5">
            <div className="text-3xl font-black text-amber-600">{pct}%</div>
            <div className="flex-1">
              <div className="mb-1 text-xs text-slate-500">{done} of {items.length} milestones complete</div>
              <ProgressBar value={pct} tone="green" />
            </div>
          </GlassCard>

          <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-gradient-to-b before:from-cyan-400/50 before:to-violet-400/20">
            {items.map((item, idx) => {
              const prereqs = item.resource?.prerequisites ? JSON.parse(item.resource.prerequisites) as string[] : [];
              return (
                <div key={item.id} className="relative">
                  <span
                    className={`absolute -left-[1.35rem] top-5 h-3 w-3 rounded-full border-2 ${
                      item.status === "done"
                        ? "border-emerald-400 bg-emerald-400"
                        : item.status === "in-progress"
                        ? "border-cyan-400 bg-[white]"
                        : "border-slate-500 bg-[white]"
                    }`}
                  />
                  <GlassCard className={`p-5 ${item.status === "done" ? "opacity-70" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone="violet">Week {item.targetWeeks ? `+${item.targetWeeks}` : "1"}</Chip>
                      <Chip>{item.skill.name}</Chip>
                      <span className="text-xs text-slate-500">
                        ~{item.estHours}h at {weeklyHours}h/wk
                        {item.estCompletionDate && ` · target ${new Date(item.estCompletionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                      </span>
                      <button
                        onClick={() => advance(item)}
                        className={`ml-auto rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          item.status === "done"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : item.status === "in-progress"
                            ? "bg-amber-500/15 text-amber-600"
                            : "bg-slate-900/[0.06] text-slate-600 hover:bg-slate-900/10"
                        }`}
                      >
                        {item.status === "done" ? "✓ Done" : item.status === "in-progress" ? "◉ In progress" : "Start"}
                      </button>
                    </div>
                    {item.resource ? (
                      <a href={item.resource.url} target="_blank" rel="noreferrer" className="mt-3 block">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-slate-900 hover:text-amber-600">{item.resource.title} ↗</div>
                          <div className="flex items-center gap-2">
                            <Chip tone={item.resource.cost === "free" ? "green" : "amber"}>{item.resource.cost}</Chip>
                            <Chip tone="cyan">{item.resource.platform}</Chip>
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                          <span>⏱ {item.resource.durationHours}h full course</span>
                          <span>· {item.resource.language}</span>
                          <span>· ★ {item.resource.rating}</span>
                          {prereqs.length > 0 && <span>· Prerequisites: {prereqs.join(", ")}</span>}
                        </div>
                      </a>
                    ) : (
                      <div className="mt-3 text-sm text-slate-500">Practice, then take the {item.skill.name} assessment</div>
                    )}
                    <div className="mt-3 text-[11px] text-slate-500">
                      Finish → take the <Link className="text-amber-600 underline" to="/assessments">{item.skill.name} assessment</Link> to validate this skill.
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
