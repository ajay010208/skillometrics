import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../state";
import { supabase, oauthAvailable, friendlyAuthError } from "../supabase";
import { api, setToken } from "../api";

const EXPLORE_KEY = "skillometrics_explored";

/** Google brand mark */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.6z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5.1L1.3 17.2C3.3 21.2 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.3c-.3-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.3 6.8C.5 8.4 0 10.1 0 12s.5 3.6 1.3 5.2l3.9-2.9z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.3 0 3.3 2.8 1.3 6.8l3.9 3c.9-3 3.6-5.1 6.8-5.1z" />
    </svg>
  );
}

/** GitHub brand mark */
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

/** LinkedIn brand mark */
function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export default function Opening() {
  const navigate = useNavigate();
  const { loginWithPersona } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [oauthOn, setOauthOn] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    oauthAvailable().then(setOauthOn);
  }, []);

  // Some embedded webviews suspend muted autoplay until a user gesture —
  // try to play on mount, then again on the first interaction.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    const kick = () => {
      tryPlay();
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, []);

  // Returning user who chose "explore first" skips the opening page.
  useEffect(() => {
    if (localStorage.getItem(EXPLORE_KEY) === "1") {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const exploreFirst = () => {
    localStorage.setItem(EXPLORE_KEY, "1");
    navigate("/login");
  };

  const oauthSignIn = async (provider: "google" | "github" | "linkedin_oidc") => {
    if (!supabase) {
      setNotice("OAuth isn't configured yet — add Supabase keys to .env (see README).");
      return;
    }
    setBusy(provider);
    setNotice(null);
    const redirectUrl = `${window.location.origin}/auth/callback`;
    // Preflight: the API asks Supabase if this provider is actually enabled.
    // supabase-js builds the authorize URL client-side and can't see the
    // server-side 400, so without this check a disabled provider sends the
    // user to a raw JSON page instead of a helpful hint.
    try {
      const status = await fetch(`/api/auth/provider-status?provider=${provider}`).then((r) => r.json());
      if (!status.ok) {
        setNotice(friendlyAuthError({ message: String(status.error ?? "") }));
        setBusy(null);
        return;
      }
    } catch {
      // API unreachable — fall through and let supabase-js try anyway.
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUrl },
    });
    if (error) {
      setNotice(friendlyAuthError(error));
      setBusy(null);
      return;
    }
    // On success the browser redirects to /auth/callback which completes login.
  };

  const demoEntry = async (email: string) => {
    setBusy(email);
    try {
      await loginWithPersona(email);
      navigate("/skill-analysis");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Login failed");
    }
    setBusy(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(201_100%_13%)]">
      {/* fullscreen looping video */}
      <video
        ref={videoRef}
        className="absolute inset-0 z-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
      />

      {/* nav */}
      <nav className="relative z-10 mx-auto flex max-w-7xl flex-row items-center justify-between px-8 py-6">
        <div className="text-3xl tracking-tight text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
          SkilloMetrics<sup className="text-xs">®</sup>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <button onClick={() => setRevealed(false)} className="text-sm text-white transition-colors">Home</button>
          {["Studio", "About", "Journal", "Reach Us"].map((l) => (
            <span key={l} className="cursor-default text-sm text-white/60 transition-colors hover:text-white">{l}</span>
          ))}
        </div>
        <button
          onClick={() => (revealed ? undefined : setRevealed(true))}
          className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white transition-transform hover:scale-[1.03]"
        >
          Begin Journey
        </button>
      </nav>

      {/* hero / reveal */}
      <div className="relative z-10 flex flex-col items-center px-6 pb-40 pt-32 text-center">
        {!revealed ? (
          <>
            <h1
              className="animate-fade-rise mx-auto max-w-7xl text-5xl font-normal leading-[0.95] tracking-[-2.46px] text-white sm:text-7xl md:text-8xl"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Where <em className="not-italic text-white/55">careers</em> rise through{" "}
              <em className="not-italic text-white/55">verified skills.</em>
            </h1>
            <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
              Don't just train — track careers and verify outcomes. Free learning paths, honest reality checks,
              real job matches, and 12 months of follow-ups that prove what training achieved.
            </p>
            <button
              onClick={() => setRevealed(true)}
              className="liquid-glass animate-fade-rise-delay-2 mt-12 cursor-pointer rounded-full px-14 py-5 text-base text-white transition-transform hover:scale-[1.03]"
            >
              Get Started
            </button>
            <button
              onClick={exploreFirst}
              className="animate-fade-rise-delay-2 mt-5 text-sm text-white/50 underline-offset-4 transition-colors hover:text-white/90 hover:underline"
            >
              or explore the dashboard first →
            </button>
          </>
        ) : (
          <div className="animate-fade-rise w-full max-w-md">
            <h2
              className="text-4xl font-normal tracking-tight text-white sm:text-5xl"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Begin your journey.
            </h2>
            <p className="mt-3 text-sm text-white/60">Sign up or sign in — it takes one click.</p>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => oauthSignIn("google")}
                disabled={busy !== null}
                className="liquid-glass flex w-full items-center justify-center gap-3 rounded-full px-6 py-4 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                <GoogleIcon /> Continue with Google {busy === "google" && "…"}
              </button>
              <button
                onClick={() => oauthSignIn("github")}
                disabled={busy !== null}
                className="liquid-glass flex w-full items-center justify-center gap-3 rounded-full px-6 py-4 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                <GitHubIcon /> Continue with GitHub {busy === "github" && "…"}
              </button>
              <button
                onClick={() => oauthSignIn("linkedin_oidc")}
                disabled={busy !== null}
                className="liquid-glass flex w-full items-center justify-center gap-3 rounded-full px-6 py-4 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                <LinkedInIcon /> Continue with LinkedIn {busy === "linkedin_oidc" && "…"}
              </button>
            </div>

            <div className="my-6 flex items-center gap-4 text-[11px] uppercase tracking-widest text-white/40">
              <span className="h-px flex-1 bg-white/15" /> or use a demo account <span className="h-px flex-1 bg-white/15" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["🎓 Student", "demo.trainee@skillometrics.in"],
                ["💼 Recruiter", "demo.recruiter@skillometrics.in"],
                ["🏫 Provider", "demo.provider@skillometrics.in"],
                ["🏛️ Govt Admin", "demo.admin@skillometrics.in"],
              ].map(([label, email]) => (
                <button
                  key={email}
                  onClick={() => demoEntry(email)}
                  disabled={busy !== null}
                  className="liquid-glass rounded-2xl px-4 py-3 text-sm text-white/90 transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {busy === email ? "…" : label}
                </button>
              ))}
            </div>

            {notice && <div className="mt-5 rounded-xl bg-black/30 px-4 py-3 text-xs text-amber-200">{notice}</div>}

            <button
              onClick={() => setRevealed(false)}
              className="mt-6 text-sm text-white/50 transition-colors hover:text-white"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
