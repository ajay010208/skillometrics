import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type OAuthProvider = "google" | "github" | "linkedin_oidc";

const url = (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL ?? "";
const anonKey = (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

/**
 * Map raw Supabase auth errors to actionable setup hints (the raw
 * "Unsupported provider" style messages mean nothing to a judge or teammate).
 */
export function friendlyAuthError(err: { message?: string } | null | undefined): string {
  const msg = err?.message ?? "";
  if (/provider is not enabled/i.test(msg))
    return "This sign-in provider isn't enabled on Supabase yet — dashboard → Authentication → Providers → enable it (paste the provider's Client ID + Secret). Demo accounts below still work.";
  if (/redirect.*(not allowed|not permitted|unsigned)/i.test(msg))
    return "Supabase rejected the redirect URL — add `http://localhost:5173/auth/callback` under Authentication → URL Configuration → Redirect URLs.";
  if (/email_address_invalid|invalid (email|recipient)/i.test(msg))
    return "Supabase won't deliver to that address — sign in with a real mailbox you can open (it validates domain deliverability).";
  if (/invalid client|oauth client|client_id/i.test(msg))
    return "Provider credentials look wrong — re-check the Client ID / Secret in Supabase → Authentication → Providers.";
  if (/signups? not allowed/i.test(msg))
    return "New sign-ups are disabled on this Supabase project — enable them under Authentication → Sign In / Providers → Email.";
  return msg || "Sign-in failed — check the Supabase dashboard configuration.";
}

/** Server also needs OAuth configured; ask it. Cached for the session. */
let oauthConfigured: boolean | null = null;
export async function oauthAvailable(): Promise<boolean> {
  if (oauthConfigured !== null) return oauthConfigured;
  try {
    const res = await fetch("/api/auth/oauth-configured");
    const json = (await res.json()) as { configured: boolean };
    oauthConfigured = Boolean(supabase) && json.configured;
  } catch {
    oauthConfigured = false;
  }
  return oauthConfigured;
}
