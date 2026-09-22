# DEPLOYMENT.md — SkilloMetrics go-live guide

Everything here reflects what was **verified in-session** on this repo: production
builds (`npm run build` ✓), all three services booted via prod scripts with
`/health` 200 ✓, `db:postgres` provider flip tested ✓, typecheck clean ✓.
The two Dockerfiles are the one exception — written and line-reviewed but
**never build-tested** (no Docker daemon on the dev machine). Step 3 closes that gap.

---

## 1. PRE-BUILD STEP (critical, easy to forget)

**Run this BEFORE building the api Docker image:**

```bash
npm run db:postgres
```

This flips `apps/api/prisma/schema.prisma` from `provider = "sqlite"` to
`provider = "postgresql"`. It is required because:

- `apps/api/prisma/migrations/migration_lock.toml` is pinned to **postgresql**.
- The api container's entrypoint runs `prisma migrate deploy`, which validates
  the schema provider against the lock and **rejects a mismatch** — the
  container will crash-loop on boot if the image was built with sqlite mode.

The Dockerfile has this same warning in a comment. If you ever need to go back
to local dev afterwards: `npm run db:sqlite`.

## 2. FIRST-TIME LOCAL VERIFICATION (after installing Docker Desktop)

Both images are built from the **repo root** (the Dockerfiles rely on the
monorepo layout, root lockfile, and root `.dockerignore`):

```bash
docker build -f apps/api/Dockerfile -t skillometrics-api .
docker build -f apps/ai/Dockerfile -t skillometrics-ai .
```

### What success looks like

**api image** — run it with a throwaway SQLite-free env (any Postgres URL works
for boot; it's only used by the entrypoint's `migrate deploy`):

```bash
docker run --rm -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e ALLOWED_ORIGINS="http://localhost:5173" \
  skillometrics-api
```

- Container starts, prints `migrate deploy` output (or a clean no-op), then
  `✔ API listening on http://localhost:4000`
- `curl http://localhost:4000/health` → `{"ok":true,"service":"api"}`
- **Known failure modes this test catches:** Prisma client not found (the
  `.prisma/` COPY path bug that was fixed but unverified), `prisma` CLI missing
  from the runtime stage, provider mismatch from skipping step 1.

**ai image**:

```bash
docker run --rm -p 8000:8000 skillometrics-ai
```

- Uvicorn banner: `Uvicorn running on http://0.0.0.0:8000`
- `curl http://localhost:8000/health` → `{"ok":true,"service":"ai","llm":false}`
- (`llm:false` is correct — `AI_API_KEY` isn't set, so deterministic fallbacks run.)

## 3. DATABASE (Supabase)

1. Create a project at [supabase.com](https://supabase.com) (or use the existing one).
2. Copy the **connection pooler** string: Project Settings → Database →
   Connection string → Transaction pooler (port `6543`, `?pgbouncer=true`).
3. With the schema in postgres mode (step 1), apply migrations:

   ```bash
   DATABASE_URL="postgresql://...pooler..." npm run db:migrate:deploy
   npm run db:seed            # optional demo data
   ```

4. **Auth → URL Configuration → Redirect URLs**: add
   `https://<your-frontend-domain>/auth/callback` (plus the localhost one for dev).

## 4. ENVIRONMENT VARIABLES

`.env.example` is the authoritative checklist — every var the stack reads is in
there with comments. Production values per service:

| Service | Vars to set on the hosting platform |
|---|---|
| **api** (Render/Railway) | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS=https://<your-frontend>`, `WEB_ORIGIN=https://<your-frontend>`, `AI_SERVICE_URL=https://<your-ai-host>`, optional `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL` |
| **ai** (Render/Railway) | `API_SERVICE_URL=https://<your-api-host>/api`, optional `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_WORKERS` |
| **web** (Vercel) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL=https://<your-api-host>` |

Notes:
- `WEB_ORIGIN` feeds the OAuth `redirect_to` (verified fallback chain:
  `WEB_ORIGIN` → first `ALLOWED_ORIGINS` entry → `localhost:5173`).
- `VITE_*` vars are **baked in at build time** by Vercel — set them before the
  build runs.
- CORS: unset `ALLOWED_ORIGINS` = allow-all (dev only). Always set it in prod.

## 5. HOSTING PLATFORMS

### Web → Vercel
1. Import the repo; **Root Directory: `apps/web`** (the `vercel.json` there
   already carries the build command, `dist` output dir, and SPA rewrites so
   `/skill-analysis` etc. survive refresh).
2. Add the three `VITE_*` vars (section 4), then deploy.

### API + AI → Render (or Railway/Fly, same idea)
1. New → Web Service → connect the repo → **Runtime: Docker**.
2. api: Dockerfile path `apps/api/Dockerfile`; ai: `apps/ai/Dockerfile`.
   Root context (not `apps/api`) — Render's UI asks for the Dockerfile path
   relative to the repo root, which is what the build command expects.
3. Health check path: `/health` (both services return 200 JSON — verified).
4. Set the env vars from section 4. Set `WEB_ORIGIN`/`ALLOWED_ORIGINS` to the
   Vercel URL from the previous step once it exists.
5. Free tiers sleep after ~15 min idle; first request after that takes ~50 s.

## 6. OAUTH PROVIDERS (Google / GitHub / LinkedIn)

In each provider's developer console, add the production redirect:

```
https://<your-supabase-project>.supabase.co/auth/v1/callback
```

(Supabase Project Settings → API shows the exact URL.) The in-app flow itself
needs no code changes — the web side derives the callback from
`window.location.origin` and the API side from `WEB_ORIGIN` (section 4).

## 7. FINAL GO-LIVE CHECKLIST

- [ ] `npm run db:postgres` run before api image build (step 1)
- [ ] Both images build and `/health` answers locally (step 2)
- [ ] `db:migrate:deploy` applied against Supabase (step 3)
- [ ] Redirect URL added in Supabase dashboard (step 3.4)
- [ ] Vercel deployed with `VITE_*` vars (step 5)
- [ ] api + ai deployed with env vars from section 4
- [ ] Provider consoles updated with the Supabase callback (step 6)
- [ ] Live smoke test: open the site → demo persona login → Skill Analysis
      page renders with data → then real Google OAuth end-to-end
- [ ] Secrets exist only in platform dashboards / gitignored `.env` — never in git

## 8. TROUBLESHOOTING QUICK REFERENCE

| Symptom | Likely cause / fix |
|---|---|
| api container restarts forever | Skipped step 1 (sqlite schema) → provider mismatch with migration lock |
| `@prisma/client did not initialize yet` at runtime | Prisma client COPY failed — rebuild after confirming root `node_modules/.prisma` COPY lines are intact |
| CORS errors in browser console | `ALLOWED_ORIGINS` on api/ai missing the frontend origin |
| OAuth redirects to `localhost:5173` | `WEB_ORIGIN` not set on the api service |
| OAuth 400/`redirect not allowed` | Frontend callback URL missing in Supabase Redirect URLs (step 3.4) |
| Web deploys but API calls fail | `VITE_API_BASE_URL` unset or set after the build ran |
