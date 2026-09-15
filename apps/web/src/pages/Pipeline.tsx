import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { GlassCard, Chip, Spinner, EmptyState } from "../components/ui";

interface Row {
  id: string;
  status: string;
  notes: string | null;
  trainee: { id: string; name: string; district: string; targetJob?: { title: string } | null };
  job: { title: string; company: string } | null;
}

const STAGES = [
  { key: "shortlisted", label: "Shortlisted", tone: "cyan" },
  { key: "interviewed", label: "Interviewed", tone: "violet" },
  { key: "offer", label: "Offer", tone: "amber" },
  { key: "hired", label: "Hired 🎉", tone: "green" },
] as const;

export default function Pipeline() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      setRows(await api<Row[]>("/recruiter/pipeline"));
    } catch {
      setRows([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const move = async (row: Row, status: string) => {
    setBusy(row.id);
    try {
      await api(`/recruiter/shortlist/${row.id}`, { method: "PATCH", body: { status } });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
    setBusy(null);
  };

  if (rows === null) return <Spinner label="Loading pipeline…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Hiring Pipeline</h1>
        <p className="text-sm text-slate-500">
          Moving a candidate to <b className="text-emerald-600">Hired</b> automatically records their placement,
          schedules 3/6/12-month follow-ups, and invites them to review your company.
        </p>
      </div>

      {rows.length === 0 && <EmptyState icon="📋" title="Pipeline empty" hint="Shortlist candidates from Talent Search." />}

      <div className="grid gap-4 lg:grid-cols-4">
        {STAGES.map((stage) => {
          const stageRows = rows.filter((r) => r.status === stage.key);
          return (
            <div key={stage.key} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Chip tone={stage.tone}>{stage.label}</Chip>
                <span className="text-xs text-slate-500">{stageRows.length}</span>
              </div>
              {stageRows.map((r) => {
                const nextStage = STAGES[STAGES.findIndex((s) => s.key === r.status) + 1];
                return (
                  <GlassCard key={r.id} className="p-4">
                    <div className="font-bold text-sm">{r.trainee.name}</div>
                    <div className="text-[11px] text-slate-500">🎯 {r.trainee.targetJob?.title ?? "—"} · 📍 {r.trainee.district}</div>
                    {r.job && <div className="mt-1 text-[11px] text-amber-600">for: {r.job.title}</div>}
                    <Link to={`/recruiter/candidate/${r.trainee.id}`} className="mt-2 block text-[11px] text-amber-600 underline">
                      View profile →
                    </Link>
                    {nextStage && (
                      <button
                        className="btn-primary mt-3 w-full justify-center !py-1.5 text-[11px]"
                        onClick={() => move(r, nextStage.key)}
                        disabled={busy === r.id}
                      >
                        {busy === r.id ? "…" : `Move to ${nextStage.label} →`}
                      </button>
                    )}
                    {r.status === "hired" && (
                      <div className="mt-2 text-[10px] text-emerald-600">✓ Placement + follow-ups auto-created</div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
