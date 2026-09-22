export const API_PORT = Number(process.env.API_PORT || 4000);
export const AI_PORT = Number(process.env.AI_PORT || 8000);

// Base URL of the FastAPI AI service. Defaults to the local dev port on
// 127.0.0.1 explicitly — Node resolves "localhost" to ::1 first on many
// systems, which fails when the AI service binds IPv4 only. In production
// (separate container/host) set AI_SERVICE_URL, e.g. http://ai:8000.
export const AI_SERVICE_URL = (
  process.env.AI_SERVICE_URL ||
  `http://127.0.0.1:${AI_PORT}`
).replace(/\/+$/, "");

/**
 * CORS allow-list. Comma-separated origins in ALLOWED_ORIGINS, e.g.
 *   ALLOWED_ORIGINS=https://skillometrics.vercel.app,https://skillo.in
 * Unset/empty in development → allow all origins (same as the old `cors()`).
 * In production ALWAYS set it — an empty list would block browser clients,
 * which is the fail-safe direction for a public deployment.
 */
export function allowedOrigins(): string[] | true {
  const raw = (process.env.ALLOWED_ORIGINS || "").trim();
  if (!raw) return true; // dev convenience: wide open locally
  const list = raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return list.length ? list : true;
}
