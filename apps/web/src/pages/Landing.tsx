import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { GlassCard, Chip } from "../components/ui";
import { useSession } from "../state";

/** Static browser-chrome mockup — shows real product UI instead of describing it. */
function BrowserFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="ml-2 truncate text-[11px] text-slate-600">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

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
            ["4", "Personas: student → govt"],
            ["12mo", "Outcome tracking window"],
            ["3/6/12mo", "Follow-up checkpoints"],
            ["SIH 26135", "Built for Smart India Hackathon"],
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

      {/* real product screens — no abstract feature cards */}
      <section>
        <h2 className="text-center text-3xl font-extrabold">What it actually looks like</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-500">
            Real screens from the platform — the honest verdict, the week-by-week plan, and the recruiter search it feeds.
        </p>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <BrowserFrame title="skillometrics.in/skill-analysis — Reality Check">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔍</span>
              <span className="text-sm font-bold">Reality Check — Data Analyst</span>
              <span className="chip bg-amber-500/15 text-amber-600">Honest mode</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              You meet 6 of 9 requirements. SQL and Excel are interview-ready; you need ~140
              focused hours on Power BI and statistics before recruiters start biting.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-200 p-2.5">
                <div className="text-lg font-extrabold text-amber-600">6/9</div>
                <div className="text-[10px] text-slate-500">requirements met</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-2.5">
                <div className="text-lg font-extrabold text-orange-600">~14w</div>
                <div className="text-[10px] text-slate-500">to employable</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-2.5">
                <div className="text-lg font-extrabold text-slate-900">137h</div>
                <div className="text-[10px] text-slate-500">learning left</div>
              </div>
            </div>
          </BrowserFrame>

          <BrowserFrame title="skillometrics.in/roadmap — this week">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip bg-orange-500/15 text-orange-600">Week +3</span>
                <span className="chip bg-slate-900/[0.06] text-slate-600">Power BI</span>
                <span className="text-[11px] text-slate-500">~12h at 10h/wk · target 21 Oct</span>
                <span className="ml-auto rounded-lg bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-600">◉ In progress</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <span className="text-sm font-semibold">Power BI Data Analyst path — free course ↗</span>
                <span className="flex gap-2">
                  <span className="chip bg-emerald-500/15 text-emerald-600">free</span>
                  <span className="chip bg-amber-500/15 text-amber-600">Microsoft Learn</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-600" style={{ width: "42%" }} />
                </div>
                <span className="text-[11px] text-slate-500">2 of 5 milestones done</span>
              </div>
            </div>
          </BrowserFrame>

          <div className="lg:col-span-2">
            <BrowserFrame title="skillometrics.in/recruiter — talent search">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-black text-amber-700">AS</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">
                    Ananya Sharma <span className="font-normal text-slate-500">· Data Analyst · Pune, MH</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="chip bg-emerald-500/15 text-emerald-600">SQL · 82% validated</span>
                    <span className="chip bg-emerald-500/15 text-emerald-600">Python · 74% validated</span>
                    <span className="chip bg-slate-900/[0.06] text-slate-600">Power BI · 45%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-600">81%</div>
                  <div className="text-[10px] text-slate-500">readiness</div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Readiness is computed from assessments and project verdicts — not resume claims.
              </p>
            </BrowserFrame>
          </div>
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

      {/* footer */}
      <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row">
        <span>SkilloMetrics — AI Career & Skilling Outcome Platform · SIH 2025</span>
        <span className="flex gap-4">
          <Link to="/privacy" className="hover:text-slate-900 hover:underline">Privacy</Link>
          <Link to="/terms" className="hover:text-slate-900 hover:underline">Terms</Link>
        </span>
      </footer>
    </div>
  );
}
