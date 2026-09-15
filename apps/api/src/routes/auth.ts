/**
 * Auth additions: Supabase OAuth session exchange + public location search.
 *
 * OAuth providers (Google / GitHub / LinkedIn via Supabase Auth) run on the
 * client with supabase-js; the resulting access token is exchanged here for a
 * platform profile. When SUPABASE_URL is unset, these endpoints 501 politely
 * and the UI falls back to demo personas.
 */
import { Router } from "express";
import { getPrisma } from "../lib/db.js";
import { searchStates, districtsFor } from "../lib/locations.js";

export const authRouter = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

function splitName(full: string | undefined): { first: string; last: string } {
  const parts = (full ?? "").trim().split(" ").filter(Boolean);
  return { first: parts[0] ?? "Learner", last: parts.slice(1).join(" ") };
}

authRouter.get("/auth/oauth-configured", (_req, res) => {
  res.json({
    configured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    providers: SUPABASE_URL ? ["google", "github", "linkedin"] : [],
  });
});

/**
 * Click-time preflight: ask Supabase whether a provider is actually enabled
 * BEFORE the browser is redirected, so a disabled/misconfigured provider
 * surfaces as a friendly UI hint instead of a raw 400 JSON page.
 */
authRouter.get("/auth/provider-status", async (req, res) => {
  const provider = String(req.query.provider ?? "").replace(/[^a-z_]/gi, "");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.json({ ok: false, error: "keys missing in server .env" });
  if (!provider) return res.status(400).json({ ok: false, error: "provider required" });
  try {
    const r = await fetch(
      `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent("http://localhost:5173/auth/callback")}`,
      { headers: { apikey: SUPABASE_ANON_KEY } }
    );
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { msg?: string };
      return res.json({ ok: false, error: j.msg ?? `Supabase returned ${r.status}` });
    }
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: false, error: "could not reach Supabase" });
  }
});

/** Exchange a Supabase access token for a platform profile (creates on first login). */
authRouter.post("/auth/oauth-session", async (req, res) => {
  const { accessToken } = req.body as { accessToken?: string };
  if (!accessToken) return res.status(400).json({ error: "accessToken required" });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(501).json({ error: "OAuth not configured on the server" });
  }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) return res.status(401).json({ error: "Invalid token" });

    const prisma = getPrisma();
    const email = data.user.email ?? `${data.user.id}@oauth.local`;
    const meta = (data.user.user_metadata ?? {}) as Record<string, string>;
    const { first, last } = splitName(meta.full_name || meta.name || email.split("@")[0]);

    // Upsert (not find-then-create) so StrictMode double-fire or rapid
    // re-logins can't race into a unique-constraint error.
    const profile = await prisma.profile.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: meta.full_name || meta.name || first,
        role: "trainee",
        trainee: { create: { name: meta.full_name || first, email, state: "", district: "", consentTracking: true } },
      },
      include: { trainee: { select: { targetJobId: true } } },
    });
    res.json({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      onboarded: profile.role !== "trainee" || Boolean(profile.trainee?.targetJobId),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "OAuth exchange failed" });
  }
});

// ---- location search (used by searchable dropdowns) ----
authRouter.get("/locations/states", (req, res) => {
  const { q } = req.query as Record<string, string | undefined>;
  res.json(searchStates(q ?? ""));
});

authRouter.get("/locations/districts", (req, res) => {
  const { state } = req.query as Record<string, string | undefined>;
  res.json(districtsFor(state ?? ""));
});
