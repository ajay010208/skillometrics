import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../state";
import { supabase, friendlyAuthError } from "../supabase";
import { GlassCard, Spinner } from "../components/ui";

const personas = [
  {
    email: "demo.trainee@skillometrics.in",
    icon: "🎓",
    name: "Ananya Sharma",
    desc: "Trainee · wants Data Analyst · has skill gaps to close",
    tone: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    email: "demo.recruiter@skillometrics.in",
    icon: "💼",
    name: "Rohit Verma",
    desc: "Recruiter · TechNova Solutions · hiring now",
    tone: "from-violet-500/20 to-violet-500/5",
  },
  {
    email: "demo.provider@skillometrics.in",
    icon: "🏫",
    name: "SkillDev Institute",
    desc: "Training provider · Maharashtra",
    tone: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    email: "demo.admin@skillometrics.in",
    icon: "🏛️",
    name: "Government Admin",
    desc: "Impact dashboards + platform admin",
    tone: "from-amber-500/20 to-amber-500/5",
  },
];

export default function Login() {
  const { loginWithPersona } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  const sendMagicLink = async () => {
    if (!supabase) {
      setError("Supabase isn't configured — add SUPABASE_URL / SUPABASE_ANON_KEY to .env (see README).");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy("magic");
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(null);
    if (err) setError(friendlyAuthError(err));
    else setMagicSent(true);
  };

  const go = async (email: string, role: string) => {
    setBusy(email);
    setError(null);
    try {
      await loginWithPersona(email);
      navigate(
        role === "recruiter" ? "/recruiter"
        : role === "admin" ? "/dashboard"
        : role === "provider" ? "/provider"
        : "/skill-analysis"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
    setBusy(null);
  };

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="text-center">
        <h1 className="text-4xl font-black">Welcome to SkilloMetrics</h1>
        <p className="mt-3 text-slate-500">
          Easy login — pick a demo account to explore the full platform instantly.
          <br />
          <span className="text-xs">Production sign-in: email magic link, Google, GitHub or LinkedIn — same profiles.</span>
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
          {/demo|seed|not found/i.test(error) && (
            <> — did you run <code>npm run db:seed</code>?</>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {personas.map((p) => (
          <button
            key={p.email}
            onClick={() => go(p.email, p.email.startsWith("demo.trainee") ? "trainee" : p.email.startsWith("demo.recruiter") ? "recruiter" : p.email.startsWith("demo.provider") ? "provider" : "admin")}
            disabled={busy !== null}
            className={`glass glass-hover bg-gradient-to-br ${p.tone} p-5 text-left disabled:opacity-50`}
          >
            {busy === p.email ? (
              <div className="flex justify-center py-4"><Spinner label="" /></div>
            ) : (
              <>
                <div className="text-3xl">{p.icon}</div>
                <div className="mt-2 font-bold text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-500">{p.desc}</div>
                <div className="mt-3 text-xs font-semibold text-amber-600">One-click login →</div>
              </>
            )}
          </button>
        ))}
      </div>

      {/* magic-link email sign-in (Supabase) */}
      <div className="glass mt-6 p-5">
        <div className="text-sm font-bold text-slate-900">✉️ Sign in with email</div>
        <p className="mt-1 text-xs text-slate-500">
          One-tap magic link, no password. First-time emails become trainee accounts automatically.
        </p>
        {magicSent ? (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
            ✅ Magic link sent to <b>{email}</b> — open it in your inbox to finish signing in.
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="glass-input flex-1"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
            />
            <button className="btn-primary whitespace-nowrap" onClick={sendMagicLink} disabled={busy !== null}>
              {busy === "magic" ? "Sending…" : "Send magic link"}
            </button>
          </div>
        )}
        {!supabase && (
          <p className="mt-2 text-[11px] text-slate-400">
            Live sign-in needs Supabase keys in <code>.env</code> — demo accounts always work.
          </p>
        )}
      </div>

      <GlassCard className="mt-8 p-5 text-center text-sm text-slate-500">
        🆕 New student?{" "}
        <button className="font-semibold text-amber-600 underline" onClick={() => go("demo.trainee@skillometrics.in", "trainee")}>
          Log in as the demo trainee
        </button>{" "}
        then complete onboarding with your own target job / resume.
      </GlassCard>
    </div>
  );
}
