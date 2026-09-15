import { AI_PORT } from "./config.js";

// 127.0.0.1 explicitly — Node resolves "localhost" to ::1 first on many
// systems, which fails when the AI service binds IPv4 only.
const AI_BASE = `http://127.0.0.1:${AI_PORT}`;

export interface AiResult<T> {
  data: T | null;
  source: "ai" | "fallback" | "unavailable";
  error?: string;
}

/** POST to the FastAPI service with a hard timeout; never throws. */
export async function aiPost<T>(path: string, body: unknown, timeoutMs = 45000): Promise<AiResult<T>> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${AI_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return { data: null, source: "unavailable", error: `AI ${res.status}` };
    const json = (await res.json()) as { data: T; source?: "ai" | "fallback" };
    return { data: json.data, source: json.source ?? "ai" };
  } catch (e) {
    return { data: null, source: "unavailable", error: e instanceof Error ? e.message : String(e) };
  }
}

export async function aiHealth(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${AI_BASE}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}
