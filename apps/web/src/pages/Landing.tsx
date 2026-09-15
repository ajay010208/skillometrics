import { Link } from "react-router-dom";
import { GlassCard, Chip } from "../components/ui";
import { useSession } from "../state";

const steps = [
  {
    n: "1",
    icon: "📄",
    title: "Upload Your Resume / Pick a Target Job",
    body: "Tell us the job you want — or drop your resume. Our AI extracts your skills, experience, and education to build your verified profile.",
  },
  {
    n: "2",
    icon: "🧠",
    title: "AI Reality Check + Learning Roadmap",
    body: "See exactly where you stand against the live job market — per-skill demand, honest verdict, and a week-by-week plan with free courses, playlists and duration estimates.",
  },
  {
    n: "3",
    icon: "🎯",
    title: "Get Matched. Get Placed. Stay Tracked.",
    body: "Match with jobs, learn from placed seniors' verified reviews, get hired — then 3/6/12-month follow-ups prove outcomes to the system that trained you.",
  },
];

const features = [
  { icon: "✅", title: "AI-Validated Skills", body: "Quizzes + real project evaluation — not just resume claims." },
  { icon: "⏱️", title: "Time-to-employable", body: "Honest estimates: hours needed → weeks at your pace → date." },
  { icon: "💬", title: "Verified Alumni Reviews", body: "Interview questions and tips from placed students at that company." },
  { icon: "🤖", title: "AI Counsellor", body: "24×7 chat that knows your profile, roadmap and the job market." },
  { icon: "🔗", title: "LinkedIn & GitHub", body: "Recruiters see your projects and validated skills directly." },
  { icon: "📊", title: "Impact Dashboard", body: "Government-grade outcome analytics across states and districts." },
];

export default function Landing() {
  const { me } = useSession();
  const dash =
    me?.profile?.role === "recruiter" ? "/recruiter"
    : me?.profile?.role === "admin" ? "/dashboard"
    : me?.profile?.role === "provider" ? "/provider"
    : "/skill-analysis";

  return (
    <div className="space-y-16 pb-16">
      {/* hero */}
      <section className="animate-fade-up pt-10 text-center">
        <Chip tone="cyan">🇮🇳 AI Career & Skilling Outcome Platform · Problem 26135</Chip>
        <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-6xl">
          Don't just train.{" "}
          <span className="bg-gradient-to-r from-amber-300 via-orange-200 to-amber-400 bg-clip-text text-transparent">
            Track careers. Verify outcomes.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-500">
          For every student in India — free resources, honest reality checks, verified skills,
          real job matches, and outcomes that are actually measured for 12 months after placement.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {me?.profile ? (
            <Link to={dash} className="btn-primary text-base">
              Open my workspace →
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-primary text-base">
                Start free — one-click login
              </Link>
              <Link to="/login" className="btn-secondary text-base">
                I'm a recruiter / official
              </Link>
            </>
          )}
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["12+", "States"],
            ["320+", "Trainees tracked"],
            ["90", "Live jobs"],
            ["3/6/12mo", "Follow-ups"],
          ].map(([v, l]) => (
            <div key={l} className="glass-soft px-4 py-3">
              <div className="text-xl font-extrabold text-amber-600">{v}</div>
              <div className="text-xs text-slate-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3-step how it works */}
      <section>
        <h2 className="text-center text-3xl font-extrabold">How Our AI Job Matching Works</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-500">
          Our AI analyzes your profile, scans the latest vacancies, and recommends the best
          matching opportunities automatically.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <GlassCard key={s.n} className="relative p-6" hover>
              <div className="absolute -top-3 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-extrabold text-slate-900 shadow-lg">
                {s.n}
              </div>
              <div className="mt-2 text-3xl">{s.icon}</div>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* features */}
      <section>
        <h2 className="text-center text-3xl font-extrabold">Everything a career needs — in one platform</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <GlassCard key={f.title} className="p-5" hover>
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-2 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* personas */}
      <section className="text-center">
        <h2 className="text-3xl font-extrabold">Built for every stakeholder</h2>
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["🎓", "Students", "Reality check → roadmap → job"],
            ["💼", "Recruiters", "Verified skills & projects"],
            ["🏫", "Providers", "Curriculum gap signals"],
            ["🏛️", "Government", "Longitudinal impact data"],
          ].map(([i, t, d]) => (
            <GlassCard key={t} className="p-5">
              <div className="text-3xl">{i}</div>
              <div className="mt-2 font-bold">{t}</div>
              <div className="text-sm text-slate-500">{d}</div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
