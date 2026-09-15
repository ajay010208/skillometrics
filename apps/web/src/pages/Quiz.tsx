import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { GlassCard, Chip, Spinner, SourceBadge } from "../components/ui";

interface QuizData {
  id: string;
  skill: { name: string };
  questions: Array<{ q: string; options: string[] }>;
  source?: string;
}

export default function Quiz() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // stored quizzes are created via /assessments/start; GET single isn't exposed,
    // so we keep the quiz in sessionStorage right after start.
    const cached = sessionStorage.getItem(`quiz_${id}`);
    if (cached) {
      setQuiz(JSON.parse(cached));
    } else {
      setErr("Quiz not found — start again from the Assessments page.");
    }
  }, [id]);

  const submit = async () => {
    if (!quiz) return;
    try {
      const r = await api<{ score: number; correct: number; total: number }>(
        `/assessments/${quiz.id}/submit`,
        { method: "POST", body: { answers } }
      );
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submit failed");
    }
  };

  if (err) return <GlassCard className="mx-auto max-w-xl p-8 text-center"><div className="text-slate-600">{err}</div><Link to="/assessments" className="btn-primary mt-4 inline-flex">Back to Assessments</Link></GlassCard>;
  if (!quiz) return <Spinner label="Loading quiz…" />;

  if (result) {
    const tone = result.score >= 70 ? "text-emerald-600" : result.score >= 45 ? "text-amber-600" : "text-rose-300";
    const badge = result.score >= 85 ? "Expert" : result.score >= 70 ? "Advanced" : result.score >= 50 ? "Proficient" : "Beginner";
    return (
      <GlassCard className="mx-auto max-w-xl p-8 text-center animate-fade-up">
        <div className="text-5xl">{result.score >= 70 ? "🎉" : result.score >= 45 ? "💪" : "📖"}</div>
        <h1 className={`mt-4 text-4xl font-black ${tone}`}>{result.score}%</h1>
        <p className="mt-1 text-slate-500">{result.correct} of {result.total} correct</p>
        <div className="mt-3"><Chip tone={result.score >= 70 ? "green" : "amber"}>Badge: {badge}</Chip></div>
        <p className="mt-4 text-sm text-slate-600">
          Your {quiz.skill.name} skill level has been updated. {result.score >= 70 ? "This skill is now AI-validated ✓" : "Review the roadmap resources and retake anytime."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/assessments" className="btn-secondary">More assessments</Link>
          <Link to="/skill-analysis" className="btn-primary">See updated readiness →</Link>
        </div>
      </GlassCard>
    );
  }

  const answered = answers.length === quiz.questions.length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-black">{quiz.skill.name} Assessment</h1>
        <SourceBadge source={quiz.source} />
      </div>
      {quiz.questions.map((q, qi) => (
        <GlassCard key={qi} className="p-5">
          <div className="font-semibold">
            {qi + 1}. {q.q}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => {
                    const next = [...answers];
                    next[qi] = oi;
                    setAnswers(next);
                  }}
                  className={`rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                    selected
                      ? "border-cyan-400/60 bg-cyan-500/15 text-slate-900"
                      : "border-slate-200 bg-slate-900/5 text-slate-600 hover:bg-slate-900/[0.06]"
                  }`}
                >
                  {String.fromCharCode(65 + oi)}. {opt}
                </button>
              );
            })}
          </div>
        </GlassCard>
      ))}
      <button className="btn-primary w-full justify-center" onClick={submit} disabled={!answered}>
        {answered ? "Submit assessment" : `Answer all ${quiz.questions.length} questions`}
      </button>
    </div>
  );
}
