import type { Request, Response, NextFunction } from "express";
import { getPrisma } from "./db.js";

/**
 * Demo-friendly auth middleware.
 *
 * Two modes:
 *  - Header `x-demo-token: <profileId>` — used by the web app's demo persona
 *    switcher and Supabase login bridge (web resolves the profile id).
 *  - `Authorization: Bearer <supabase-jwt>` — verified against Supabase
 *    PROJECT_URL/.well-known/jwks.json when SUPABASE_URL is configured.
 *
 * For the hackathon demo, unauthenticated requests still work in read-only
 * "spectator" mode, but every route that needs an identity checks
 * req.profile and 401s if missing.
 */

export interface ReqProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

declare module "express-serve-static-core" {
  interface Request {
    profile?: ReqProfile | null;
  }
}

let jwksCache: { keys: unknown[]; fetchedAt: number } | null = null;

async function getJwks(supabaseUrl: string): Promise<unknown[] | null> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < 3600_000) return jwksCache.keys;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as { keys: unknown[] };
    jwksCache = { keys: data.keys, fetchedAt: Date.now() };
    return data.keys;
  } catch {
    return null;
  }
}

/** Verify a Supabase JWT using node's built-in crypto (no external dep). */
async function verifySupabaseJwt(
  token: string,
  supabaseUrl: string
): Promise<{ email: string; name?: string } | null> {
  try {
    const { createPublicKey, verify, createVerify } = await import("node:crypto");
    const [headerB64] = token.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
    const keys = await getJwks(supabaseUrl);
    if (!keys) return null;
    for (const k of keys as Array<Record<string, string>>) {
      if ((k as { kid?: string }).kid !== header.kid) continue;
      const pub = createPublicKey({ key: k as never, format: "jwk" });
      const [h, p, s] = token.split(".");
      const ok =
        header.alg === "RS256"
          ? verify("RSA-SHA256", Buffer.from(`${h}.${p}`), pub, Buffer.from(s, "base64url"))
          : createVerify("SHA256") && false;
      if (ok) {
        const payload = JSON.parse(Buffer.from(p, "base64url").toString());
        return { email: payload.email ?? "", name: payload.user_metadata?.full_name };
      }
    }
    return null;
  } catch {
    return null;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || "";

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const demo = req.header("x-demo-token");
  if (demo) {
    const profile = await getPrisma().profile.findUnique({ where: { id: demo } });
    if (profile) {
      req.profile = { id: profile.id, email: profile.email, name: profile.name, role: profile.role };
      return next();
    }
  }
  const bearer = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer && SUPABASE_URL) {
    const claims = await verifySupabaseJwt(bearer, SUPABASE_URL);
    if (claims?.email) {
      const profile = await getPrisma().profile.findUnique({ where: { email: claims.email } });
      if (profile) {
        req.profile = { id: profile.id, email: profile.email, name: profile.name, role: profile.role };
        return next();
      }
    }
  }
  req.profile = null;
  next();
}

export function requireProfile(req: Request): ReqProfile {
  if (!req.profile) {
    const err = new Error("Login required") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return req.profile;
}

export function requireRole(req: Request, ...roles: string[]): ReqProfile {
  const p = requireProfile(req);
  if (!roles.includes(p.role)) {
    const err = new Error("Forbidden for your role") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return p;
}
