import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { GlassCard, Chip, Spinner, EmptyState } from "../components/ui";

interface FollowUp {
  id: string;
  milestone: number;
  dueAt: string;
  completedAt: string | null;
  stillEmployed: boolean | null;
  currentSalary: number | null;
}

interface Placement {
  id: string;
  employer: string;
  jobTitle: string;
  joiningDate: string;
  monthlySalary: number;
  district: string;
  state: string;
  type: string;
  employerVerified: boolean;
  followUps: FollowUp[];
  reviews: unknown[];
}

export default function Placement() {
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [form, setForm] = useState({
    employer: "",
    jobTitle: "",
    joiningDate: new Date().toISOString().slice(0, 10),
    monthlySalary: 25000,
    district: "",
    type: "job",
  });
  const [reviewForm, setReviewForm] = useState({
    overallRating: 4,
    interviewDifficulty: 3,
    workCultureRating: 4,
    wouldRecommend: true,
    interviewQuestions: "",
    preparationTips: "",
    salaryNegotiationNotes: "",
    text: "",
  });

  const load = async () => {
    try {
      const p = await api<Placement[]>("/placements");
      setPlacements(p);
    } catch {
      setPlacements([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      await api("/placements", {
        method: "POST",
        body: { ...form, joiningDate: new Date(form.joiningDate), monthlySalary: Number(form.monthlySalary) },
      });
      setShowForm(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
    setBusy(false);
  };

  const submitReview = async (placementId: string) => {
    setBusy(true);
    try {
      await api("/reviews", {
        method: "POST",
        body: {
          placementId,
          ...reviewForm,
          interviewQuestions: reviewForm.interviewQuestions.split("\n").map((s) => s.trim()).filter(Boolean),
        },
      });
      setReviewFor(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
    setBusy(false);
  };

  if (placements === null) return <Spinner label="Loading placements…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Career Outcome Tracker</h1>
          <p className="text-sm text-slate-500">Placements power follow-ups and impact dashboards — and help juniors via your reviews.</p>
        </div>
        {!placements.length && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>＋ I got placed!</button>
        )}
      </div>

      {placements.length === 0 && !showForm && (
        <EmptyState
          icon="🎉"
          title="No placement recorded yet"
          hint="Got an offer? Record it here — even self-employment and apprenticeships count. This unlocks 3/6/12-month career tracking."
        />
      )}

      {showForm && (
        <GlassCard className="space-y-3 p-6">
          <h2 className="section-title">Record your placement</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="glass-input" placeholder="Employer / company name" value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} />
            <input className="glass-input" placeholder="Job title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            <label className="text-xs text-slate-500">
              Joining date
              <input type="date" className="glass-input mt-1 w-full" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">
              Monthly salary (₹)
              <input type="number" className="glass-input mt-1 w-full" value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: Number(e.target.value) })} />
            </label>
            <input className="glass-input" placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            <select className="glass-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="job">Job</option>
              <option value="self-employment">Self-employment</option>
              <option value="apprenticeship">Apprenticeship</option>
            </select>
          </div>
          <button className="btn-primary w-full justify-center" onClick={submit} disabled={busy || !form.employer || !form.jobTitle}>
            {busy ? "Saving…" : "🎉 Save placement — unlocks follow-up tracking"}
          </button>
        </GlassCard>
      )}

      <div className="space-y-5">
        {placements.map((p) => (
          <div key={p.id} className="space-y-4">
            {/* congratulations card */}
            <GlassCard className="overflow-hidden border-emerald-400/25 p-0">
              <div className="bg-gradient-to-r from-emerald-500/20 via-cyan-500/15 to-violet-500/20 px-6 py-4 text-center">
                <div className="text-2xl">🏆 Congratulations — Placed!</div>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-5">
                {[
                  ["Employer", p.employer],
                  ["Job title", p.jobTitle],
                  ["Joining", new Date(p.joiningDate).toLocaleDateString("en-IN")],
                  ["Salary", `₹${p.monthlySalary.toLocaleString("en-IN")}/mo`],
                  ["Location", `${p.district}, ${p.state}`],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">{l}</div>
                    <div className="font-bold text-slate-900">{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-6 py-4">
                <Chip tone={p.type === "job" ? "cyan" : "violet"}>{p.type}</Chip>
                {p.employerVerified ? <Chip tone="green">✓ Employer verified</Chip> : <Chip tone="amber">verification pending</Chip>}
                {p.reviews.length === 0 && (
                  <button className="btn-primary ml-auto !py-2 text-xs" onClick={() => setReviewFor(reviewFor === p.id ? null : p.id)}>
                    ★ Help juniors — review {p.employer}
                  </button>
                )}
                {p.reviews.length > 0 && <Chip tone="green">✓ You reviewed this company — thank you!</Chip>}
              </div>
            </GlassCard>

            {/* review form */}
            {reviewFor === p.id && (
              <GlassCard className="space-y-3 border-amber-400/25 p-6">
                <h3 className="section-title">Review {p.employer} <Chip tone="green">✓ only placed trainees can review</Chip></h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs text-slate-500">Overall rating: {reviewForm.overallRating}★
                    <input type="range" min={1} max={5} value={reviewForm.overallRating} onChange={(e) => setReviewForm({ ...reviewForm, overallRating: Number(e.target.value) })} className="mt-2 w-full accent-amber-400" />
                  </label>
                  <label className="text-xs text-slate-500">Interview difficulty: {reviewForm.interviewDifficulty}/5
                    <input type="range" min={1} max={5} value={reviewForm.interviewDifficulty} onChange={(e) => setReviewForm({ ...reviewForm, interviewDifficulty: Number(e.target.value) })} className="mt-2 w-full accent-violet-400" />
                  </label>
                  <label className="text-xs text-slate-500">Work culture: {reviewForm.workCultureRating}★
                    <input type="range" min={1} max={5} value={reviewForm.workCultureRating} onChange={(e) => setReviewForm({ ...reviewForm, workCultureRating: Number(e.target.value) })} className="mt-2 w-full accent-cyan-400" />
                  </label>
                </div>
                <textarea className="glass-input w-full" placeholder="Interview questions you were asked (one per line)" value={reviewForm.interviewQuestions} onChange={(e) => setReviewForm({ ...reviewForm, interviewQuestions: e.target.value })} />
                <input className="glass-input w-full" placeholder="Preparation tips for juniors" value={reviewForm.preparationTips} onChange={(e) => setReviewForm({ ...reviewForm, preparationTips: e.target.value })} />
                <input className="glass-input w-full" placeholder="Salary negotiation notes (optional)" value={reviewForm.salaryNegotiationNotes} onChange={(e) => setReviewForm({ ...reviewForm, salaryNegotiationNotes: e.target.value })} />
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={reviewForm.wouldRecommend} onChange={(e) => setReviewForm({ ...reviewForm, wouldRecommend: e.target.checked })} className="h-4 w-4 accent-cyan-400" />
                  I would recommend this employer to other trainees
                </label>
                <button className="btn-primary w-full justify-center" onClick={() => submitReview(p.id)} disabled={busy}>
                  {busy ? "Posting…" : "Post verified review ✓"}
                </button>
              </GlassCard>
            )}

            {/* follow-up timeline */}
            <GlassCard className="p-6">
              <h3 className="section-title">📆 Longitudinal follow-ups</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {p.followUps.map((f) => {
                  const overdue = !f.completedAt && new Date(f.dueAt) < new Date();
                  return (
                    <div key={f.id} className={`glass-soft p-4 ${overdue ? "border-amber-400/40" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{f.milestone}-month</span>
                        {f.completedAt ? <Chip tone="green">✓ done</Chip> : overdue ? <Chip tone="amber">due</Chip> : <Chip>upcoming</Chip>}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Due {new Date(f.dueAt).toLocaleDateString("en-IN")}
                      </div>
                      {f.completedAt && (
                        <div className="mt-2 text-xs text-slate-600">
                          Still employed: <b>{f.stillEmployed ? "Yes ✓" : "No"}</b>
                          {f.currentSalary && <> · ₹{f.currentSalary.toLocaleString("en-IN")}/mo</>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-xs text-slate-500">
                Check-ins happen automatically (automated call → WhatsApp → assisted). Complete yours in the{" "}
                <Link to="/followups" className="text-amber-600 underline">Follow-ups page</Link>.
              </div>
            </GlassCard>
          </div>
        ))}
      </div>
    </div>
  );
}
