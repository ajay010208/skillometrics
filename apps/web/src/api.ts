const TOKEN_KEY = "skillometrics_token";

/**
 * Base URL of the Express API.
 *  - Unset (default): same-origin "/api" — works with the Vite dev proxy,
 *    `vite preview` behind any reverse proxy, and same-domain deployments.
 *  - Set VITE_API_BASE_URL (e.g. https://api.skillometrics.in/api) when the
 *    API is hosted on a different domain from the frontend.
 */
const API_BASE: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
  "/api";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["x-demo-token"] = token;
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return json as T;
}

export { API_BASE };
