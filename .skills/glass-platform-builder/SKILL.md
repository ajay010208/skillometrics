# Glass Platform Builder

Build a full-stack, demo-ready platform (or major feature batch) with a glassmorphism React UI, typed API, database persistence, and verified end-to-end flows — following the process used to build SkilloMetrics.

## When to use
- "Build me a dashboard/app/platform end-to-end"
- "Add these features and verify they work"
- Any request spanning UI + API + database + seed data + live verification

## Process

### 1. Plan before code
- Write a todo list with one entry per user-visible flow; keep it updated as you complete each.
- Agree the stack up front (here: React+TS+Vite+Tailwind web, Express+Prisma API :4000, FastAPI AI :8000, SQLite dev / Postgres-Supabase prod).

### 2. Build backend-first, typecheck before moving on
- Schema first (Prisma), then routes, then `tsc --noEmit` until clean.
- Store JSON in String columns so SQLite and Postgres behave identically; parse via `jparse`.
- Wrap every external call (AI service, OAuth) so failure degrades to a deterministic fallback — the demo must never break. Label the source in the UI ("✦ AI" vs "⚡ Smart engine").

### 3. Seed realistic data
- Deterministic RNG seed, believable distributions, demo personas for every role (trainee/recruiter/provider/admin) so any screen can be shown instantly.
- Include history (back-dated placements, completed follow-ups) so charts are alive on first load.

### 4. Frontend with a small glass kit
- One `.glass` utility (bg-white/7, backdrop-blur-xl, border-white/15, rounded-2xl), `.btn-primary`, `.chip`, KPI tiles, ProgressBar, Spinner, EmptyState — compose everything from these.
- Dark theme, aurora background, animate-fade-up entries.

### 5. Boot & verify live (never skip)
- Start services detached (`nohup … &`), health-check each port, register the preview.
- Drive every new flow in the preview: snapshot, click real buttons, assert on rendered text. Verify with screenshots/DOM reads — "it typechecks" is not "it works".

### 6. Environment gotchas (hit in practice)
- Prisma reads `.env` next to the schema, not repo root — keep a copy in `apps/api/`.
- Prisma relations need opposite fields on both models; run `prisma db push` and fix validation errors iteratively.
- Node ≥17 resolves `localhost` to IPv6 `::1` first; services bound to 127.0.0.1 become unreachable. Use `127.0.0.1` explicitly in service-to-service URLs.
- Express 4 does not catch errors thrown in async handlers — a single 401 can kill the process. Use Express 5.
- React inputs need the native value setter + `input` event for programmatic typing; React synthetic focus needs a real `.focus()` call (a `focusin` event alone doesn't trigger it).
- On Windows: `taskkill //F //PID`, Git Bash heredocs for commits, restart the right process after editing server code (find the listener PID first).

### 7. UX patterns worth reusing
- Opening page: cinematic hero → "Get Started" reveals sign-in options; store "explore first" in localStorage to skip it for returning users.
- Searchable dropdowns (type "gu" → Gujarat): async option source, keyboard navigation, city list refetches when state changes.
- Persist onboarding/profile through one upsert endpoint; prefill the form from it so edits survive sessions.
- Location-aware insights: salary bands (national vs state vs city), demand-vs-your-level bars, state-filtered job lists.

## Verification checklist
- [ ] `tsc --noEmit` clean in every TS package
- [ ] All services health-checked
- [ ] Each new flow clicked through in preview with assertions on real rendered text
- [ ] Fallback path proven (works with no API keys)
- [ ] Seed re-runs cleanly from scratch
