import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { GlassCard, Chip, Spinner, Stars, EmptyState, QuestionList, Avatar } from "../components/ui";

interface Review {
  id: string;
  companyName: string;
  overallRating: number;
  interviewDifficulty: number;
  interviewQuestions: string[];
  preparationTips: string | null;
  workCultureRating: number;
  salaryNegotiationNotes: string | null;
  wouldRecommend: boolean;
  text: string | null;
  trainee: { name: string; district: string; state: string };
  placedOn: string;
}

export default function CompanyReviews() {
  const { name } = useParams();
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    api<Review[]>(`/reviews/company/${encodeURIComponent(name ?? "")}`)
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [name]);

  if (reviews === null) return <Spinner label="Loading reviews…" />;

  const avg = reviews.length ? reviews.reduce((a, r) => a + r.overallRating, 0) / reviews.length : 0;
  const allQuestions = reviews.flatMap((r) => r.interviewQuestions);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <GlassCard className="p-6 text-center">
        <div className="text-4xl">🏢</div>
        <h1 className="mt-2 text-3xl font-black">{name}</h1>
        {reviews.length > 0 ? (
          <>
            <div className="mt-2 flex items-center justify-center gap-3">
              <Stars value={avg} size="text-xl" />
              <span className="text-lg font-bold text-amber-600">{avg.toFixed(1)}</span>
              <span className="text-sm text-slate-500">· {reviews.length} verified review{reviews.length > 1 ? "s" : ""}</span>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Chip tone="green">✓ All reviewers placed via SkilloMetrics</Chip>
              <Chip tone="cyan">Interview difficulty: {(reviews.reduce((a, r) => a + r.interviewDifficulty, 0) / reviews.length).toFixed(1)}/5</Chip>
            </div>
            {allQuestions.length > 0 && (
              <div className="glass-soft mx-auto mt-5 max-w-xl p-4 text-left">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Most common interview questions</div>
                <div className="mt-2"><QuestionList questions={[...new Set(allQuestions)].slice(0, 6)} /></div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-slate-500">No verified reviews yet.</p>
        )}
      </GlassCard>

      {reviews.length === 0 && <EmptyState icon="★★★★★" title="Be the first" hint="Placed here? Leave a review from your Placement page." />}

      <div className="space-y-4">
        {reviews.map((r) => (
          <GlassCard key={r.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Avatar name={r.trainee.name} />
              <Stars value={r.overallRating} />
              <span className="font-bold text-amber-600">{r.overallRating}/5</span>
              <Chip tone="green">✓ Verified — placed {new Date(r.placedOn).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</Chip>
              <span className="ml-auto text-xs text-slate-500">
                <b className="text-slate-700">{r.trainee.name}</b> · {r.trainee.district}, {r.trainee.state}
              </span>
            </div>
            {r.text && <p className="mt-3 text-sm italic text-slate-600">“{r.text}”</p>}
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              {r.preparationTips && <div className="glass-soft p-3">💡 “{r.preparationTips}”</div>}
              {r.salaryNegotiationNotes && <div className="glass-soft p-3">💰 “{r.salaryNegotiationNotes}”</div>}
            </div>
            {r.interviewQuestions.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-bold uppercase text-slate-500">Interview questions</div>
                <div className="mt-1.5"><QuestionList questions={r.interviewQuestions} /></div>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
