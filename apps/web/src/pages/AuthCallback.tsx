import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { api, setToken } from "../api";
import { Spinner } from "../components/ui";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setErr("OAuth not configured");
        return;
      }
      // supabase-js detects the hash/pkce code from the redirect automatically.
      // The code exchange can land a beat after first paint — poll briefly.
      let accessToken: string | undefined;
      let lastError: string | null = null;
      for (let i = 0; i < 10 && !accessToken; i++) {
        const { data, error } = await supabase.auth.getSession();
        accessToken = data.session?.access_token;
        lastError = error?.message ?? null;
        if (!accessToken) await new Promise((r) => setTimeout(r, 300));
      }
      if (!accessToken) {
        setErr(lastError ?? "No session after redirect");
        return;
      }
      try {
        const profile = await api<{ id: string; role: string; onboarded: boolean }>("/auth/oauth-session", {
          method: "POST",
          body: { accessToken },
        });
        setToken(profile.id);
        // New trainees go through onboarding; everyone else lands in their workspace.
        if (!profile.onboarded) {
          navigate("/onboarding", { replace: true });
        } else if (profile.role === "recruiter") navigate("/recruiter", { replace: true });
        else if (profile.role === "admin") navigate("/dashboard", { replace: true });
        else if (profile.role === "provider") navigate("/provider", { replace: true });
        else navigate("/skill-analysis", { replace: true });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Sign-in exchange failed");
      }
    })();
  }, [navigate]);

  if (err) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[white] text-center">
        <div className="text-rose-300">{err}</div>
        <button className="btn-primary" onClick={() => navigate("/login")}>Back to login</button>
      </div>
    );
  }
  return <Spinner label="Completing sign-in…" />;
}
