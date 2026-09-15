import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { GlassCard, Chip, ProgressBar, Spinner, EmptyState, QuestionList, Avatar } from "../components/ui";
import MarketInsights from "./MarketInsights";

interface Job {
  id: string;
  title: string;
  company: string;
  state: string;
  district: string;
  salaryMin: number;
  salaryMax: number;
  source: string;
  postedAt: string;
}

interface ScoredSkill {
  name: string;
  traineeLevel: number;
  minLevel: number;
  met: boolean;
}

interface MatchRow {
  job: Job;
  match: { status: string } | null;
  breakdown: {
    score: number;
    skillFit: number;
    locFit: number;
    skills: ScoredSkill[];
  } | null;
}

interface Review {
  id: string;
  companyName: string;
  overallRating: number;
  interviewDifficulty: number;
  interviewQuestions: string[];
  preparationTips: string | null;
  workCultureRating: number;
  wouldRecommend: boolean;
  text: string | null;
  trainee: { name: string; district: string };
  placedOn: string;
}

export default function Jobs() {
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const [reviewsFor, setReviewsFor] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "48h" | "state">("all");
  const [myState, setMyState] = useState<string>("");

  useEffect(() => {
    api<MatchRow[]>("/jobs/matches")
      .then((r) => setRows(r))
      .catch(() => setRows([]));
    api<{ trainee: { state: string } | null }>("/auth/me")
      .then((r) => setMyState(r.trainee?.state ?? ""))
      .catch(() => {});
  }, []);

  const toggleReviews = async (company: string) => {
    if (reviewsFor === company) {
      setReviewsFor(null);
      return;
    }
    setReviewsFor(company);
    setLoadingReviews(true);
    try {
      const r = await api<Review[]>(`/reviews/company/${encodeURIComponent(company)}`);
      setReviews(r);
    } catch {
      setReviews([]);
    }
    setLoadingReviews(false);
  };

  const apply = async (jobId: string) => {
    setApplying(jobId);
    await api(`/jobs/${jobId}/apply`, { method: "POST" }).catch(() => {});
    setRows((cur) => cur?.map((r) => (r.job.id === jobId ? { ...r, match: { status: "applied" } } : r)) ?? null);
    setApplying(null);
  };

  if (rows === null) return <Spinner label="Matching jobs to your profile…" />;

  const visible =
    filter === "state" && myState
      ? rows.filter((r) => r.job.state === myState)
      : rows;
  const top = visible.slice(0, 20);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Your Job Matches</h1>
          <p className="text-sm text-slate-500">
            Ranked by verified skill fit and location. Every score is explainable — expand a job to see the math.
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "48h", "state"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === f ? "bg-amber-500/15 text-amber-600" : "bg-slate-900/5 text-slate-500"}`}
            >
              {f === "all" ? "All jobs" : f === "48h" ? "Posted within 48h" : `In my state${myState ? ` (${myState})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      {filter === "state" && (
        <GlassCard className="p-6">
          <MarketInsights />
        </GlassCard>
      )}

      {top.length === 0 && <EmptyState icon="💼" title="No matches yet" hint="Set a target job in onboarding and build your skills." />}

      <div className="space-y-3">
        {top.map(({ job, match, breakdown }) => (
          <GlassCard key={job.id} className="p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/25 to-violet-500/25 text-2xl">
                💼
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900">{job.title}</span>
                  <span className="text-slate-500">· {job.company}</span>
                  <Chip tone={job.source === "Recruiter" ? "violet" : "slate"}>{job.source}</Chip>
                  <Chip tone="green">48h</Chip>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>📍 {job.district}, {job.state}</span>
                  <span>₹{job.salaryMin.toLocaleString("en-IN")}–{job.salaryMax.toLocaleString("en-IN")}/mo</span>
                  {match && <Chip tone="cyan">{match.status}</Chip>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-2xl font-black ${(breakdown?.score ?? 0) >= 70 ? "text-emerald-600" : (breakdown?.score ?? 0) >= 45 ? "text-amber-600" : "text-slate-500"}`}>
                    {breakdown?.score ?? 0}%
                  </div>
                  <div className="text-[10px] uppercase text-slate-500">match</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    className={`btn-primary !px-4 !py-2 text-xs ${match ? "opacity-60" : ""}`}
                    onClick={() => apply(job.id)}
                    disabled={applying === job.id || match?.status === "applied"}
                  >
                    {match?.status === "applied" ? "✓ Applied" : applying === job.id ? "…" : "Apply"}
                  </button>
                  <button className="btn-ghost !py-1 text-xs" onClick={() => toggleReviews(job.company)}>
                    ★ {reviewsFor === job.company ? "Hide" : "Reviews"}
                  </button>
                </div>
              </div>
            </div>

            {/* explainability */}
            {breakdown && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-900">
                  Why {breakdown.score}%? — skill fit {breakdown.skillFit}% · location {breakdown.locFit}%
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {breakdown.skills.map((s) => (
                    <div key={s.name} className="glass-soft flex items-center gap-3 px-3 py-2 text-xs">
                      <span className="w-28 truncate font-semibold text-slate-200">{s.name}</span>
                      <div className="flex-1"><ProgressBar value={s.traineeLevel} tone={s.met ? "green" : "pink"} /></div>
                      <span className={s.met ? "text-emerald-600" : "text-rose-300"}>
                        {s.traineeLevel}/{s.minLevel} {s.met ? "✓" : "✗"}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* reviews */}
            {reviewsFor === job.company && (
              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">✓ Verified reviews from placed trainees</div>
                  <Link to={`/company/${encodeURIComponent(job.company)}`} className="text-xs text-amber-600 underline">
                    All company reviews →
                  </Link>
                </div>
                {loadingReviews && <div className="text-xs text-slate-500">Loading reviews…</div>}
                {!loadingReviews && reviews.length === 0 && (
                  <div className="text-xs text-slate-500">No reviews yet for {job.company} — be the first placed trainee to review it!</div>
                )}
                {reviews.map((r) => (
                  <div key={r.id} className="glass-soft p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar name={r.trainee.name} size="h-7 w-7 text-[10px]" />
                      <span className="text-amber-600">{"★".repeat(r.overallRating)}{"☆".repeat(5 - r.overallRating)}</span>
                      <Chip tone="green">✓ Verified — placed {new Date(r.placedOn).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</Chip>
                      <span className="text-xs text-slate-500"><b className="text-slate-700">{r.trainee.name}</b> · {r.trainee.district}</span>
                      {r.wouldRecommend && <Chip tone="cyan">would recommend</Chip>}
                    </div>
                    {r.text && <p className="mt-2 italic text-slate-600">“{r.text}”</p>}
                    {r.interviewQuestions.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] font-bold uppercase text-slate-500">Interview questions asked</div>
                        <div className="mt-1.5"><QuestionList questions={r.interviewQuestions} compact /></div>
                      </div>
                    )}
                    {r.preparationTips && (
                      <div className="mt-2 text-xs text-emerald-600">💡 “{r.preparationTips}”</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
