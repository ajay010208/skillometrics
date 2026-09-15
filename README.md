# SkilloMetrics — AI Career & Skilling Outcome Platform

![SIH 2025](https://img.shields.io/badge/Smart%20India%20Hackathon-PS%2026135-1F6FEB?logo=codefactor&logoColor=white)
![Stack](https://img.shields.io/badge/stack-React%20·%20Express%20·%20FastAPI-0EA5E9)
![Auth](https://img.shields.io/badge/auth-Supabase%20OAuth%20%2B%20PKCE-3ECF8E?logo=supabase&logoColor=white)
![DB](https://img.shields.io/badge/db-SQLite%20→%20Postgres-336791?logo=sqlite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-TBD-lightgrey)

**Don't just train. Track careers. Verify outcomes.** A longitudinal skilling-outcomes platform for all of India (SIH Problem 26135): consent-based trainee records → AI skill analysis + Reality Check → learning roadmap with real resources → AI assessments & project validation → job matching → placement → verified alumni reviews → 3/6/12-month follow-ups → government impact dashboard.

## Stack
- **Web:** React 18 + TypeScript + Vite + Tailwind (glassmorphism UI)
- **API:** Node.js + Express 5 + Prisma
- **AI:** Python + FastAPI (LLM when a key is set, deterministic fallbacks otherwise — demo never breaks)
- **DB:** SQLite locally (zero setup) or Supabase Postgres in production
- **Auth:** Supabase OAuth (Google / GitHub / LinkedIn) + one-click demo personas

## Quick start (local demo, no accounts needed)

```bash
npm run setup        # installs everything + creates the Python venv
npm run db:push      # creates SQLite schema
npm run db:seed      # 320+ trainees across 12 states, jobs, resources, reviews
npm run dev          # boots API :4000, AI :8000, web :5173 together
```

Open http://localhost:5173 — you'll land on the cinematic opening page. Click **Get Started** and pick a demo persona:

| Persona | Email | Shows |
|---|---|---|
| 🎓 Student | demo.trainee@skillometrics.in | Skill gaps, Reality Check, roadmap, jobs, reviews |
| 💼 Recruiter | demo.recruiter@skillometrics.in | Talent search, projects, pipeline → hire |
| 🏫 Provider | demo.provider@skillometrics.in | Course outcomes, curriculum signals |
| 🏛️ Govt Admin | demo.admin@skillometrics.in | Impact dashboard, AI analytics, admin panel |

## Real OAuth (Google / GitHub / LinkedIn)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Authentication → Providers**, enable Google, GitHub, and/or LinkedIn and paste the client IDs/secrets from each provider's console. For each provider add the redirect callback shown by Supabase (`https://<project>.supabase.co/auth/v1/callback`).
3. In **Auth → URL Configuration**, add `http://localhost:5173/auth/callback` as a redirect URL.
4. Copy your project URL + anon key into `.env` (root) — both plain and `VITE_` versions:
   ```
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_ANON_KEY=<anon-key>
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```
5. Restart `npm run dev`. The opening page's **Continue with Google / GitHub / LinkedIn** buttons now run the real OAuth flow; first login creates a trainee profile automatically and routes into onboarding.

## Production database (Supabase Postgres)

```bash
npm run db:postgres                    # flips the Prisma provider
# set DATABASE_URL in .env to your Supabase pooler connection string
npm run db:push && npm run db:seed
```

## Optional: real LLM for the AI service

Set `AI_API_KEY` (OpenAI-compatible or Gemini — see `.env.example`). Without a key every AI feature runs on built-in deterministic engines; the UI labels which one is live (✦ AI vs ⚡ Smart engine).

## 5-minute judge demo script

1. **Opening (30s):** cinematic hero → *Get Started* → reveal. Note "explore first" is remembered for returning users.
2. **Reality Check (1 min, trainee):** 68% ready, honest verdict "NOT YET — 2/6 requirements met", market demand vs your level, ~7 weeks to employable, each gap mapped to free resources (freeCodeCamp, NPTEL, Microsoft Learn, Khan Academy, Hindi YouTube) with duration + prerequisites + cost.
3. **Roadmap → Assessment (1 min):** week-by-week plan with dates; take the Power BI quiz → score updates the skill level → readiness recalculates.
4. **Jobs + alumni reviews (1 min):** ranked matches with explainable scores ("why 82%?"); expand a company to see ✓ verified reviews from placed trainees — interview questions and tips.
5. **Recruiter (1 min):** search validated talent by skill/state, open a candidate's projects + GitHub, shortlist → pipeline → **Hired** auto-creates placement + 3/6/12-month follow-ups + review prompt.
6. **Follow-up & Govt dashboard (30s):** trainee check-in (salary/skill usage); admin sees placement %, retention curve, wage progression, "why people aren't getting jobs" AI analytics, consent audit log.
7. **Closing line:** consent-based, longitudinal, pan-India — the missing outcome layer for skilling (PS 26135).

## Project layout

```
apps/web    React SPA (pages per persona, glass kit, AI chat widget)
apps/api    Express 5 + Prisma (auth, trainee, market, recruiter, provider, admin, chat routes)
apps/ai     FastAPI (resume parsing, quizzes, project evaluation, insights, counsellor agent)
.skills/    Reusable build-process skill (glass-platform-builder)
```
