# SkilloMetrics — SIH 2025 Ideation PPT Content (PS 26135)

Final on-slide text (what the filled deck `SIH2025-SkilloMetrics-idea.pptx` carries), consolidated for review/editing. Template headings stay untouched; only pointer text and images were filled.

---

## Slide 1 — TITLE PAGE

| Field | Value |
|---|---|
| Problem Statement ID | 26135 |
| Problem Statement Title | Skilling Outcome Tracking Platform |
| Theme | Smart Education / Skilling |
| PS Category | Software |
| Team ID | (fill on portal) |
| Team Name | (your registered team name) |

Idea title used across the deck: **SkilloMetrics — AI Career & Skilling Outcome Platform**

---

## Slide 2 — IDEA TITLE / PROPOSED SOLUTION

*(Visual: `skillometrics-workflow.png` — "Trainee journey — from sign-up to verified outcome")*

**What we built**
- A longitudinal skilling-outcomes platform: consent-based trainee records from sign-up to 12 months after placement
- AI skill analysis with an honest Reality Check (68% ready — NOT YET, 2/6 requirements met) and week-by-week roadmap of free resources

**How it addresses the problem**
- Skilling today stops at certificates; nobody measures whether training led to a job that lasted
- 3/6/12-month follow-ups verify placement, retention and wage growth — the outcome layer India's skilling mission is missing

**Innovation & uniqueness**
- Verified outcomes, not self-reported claims: employer-confirmed placement + trainee cross-checks
- Explainable job-match scores ("why 82%?"), consent-first design, one-click demo personas for every stakeholder

**Speaker line:** "Everyone else measures training inputs. We measure what actually happened to the trainee — for 12 months after the job starts."

---

## Slide 3 — TECHNICAL APPROACH

*(Visual: `skillometrics-architecture.png` — "Platform architecture — web, API, AI service, auth boundary, data")*

**Technology stack**
- React 18 + Vite + Tailwind (SPA, 4 persona dashboards) · Express 5 + Prisma · Python FastAPI (AI service)
- Supabase Auth: Google / GitHub / LinkedIn OAuth + magic links, JWT with PKCE, JWKS verification
- SQLite in dev → Supabase Postgres in production via a single config switch

**Methodology**
- Consent captured at onboarding → AI analysis → skill verification → placement → outcome tracking
- AI quizzes, resume parsing and project validation run with deterministic fallbacks — the demo never breaks
- Architecture (right): request path, auth boundary, AI service and data stores

---

## Slide 4 — FEASIBILITY AND VIABILITY

**Feasibility**
- Working prototype runs today: 320+ trainees, 12 states, 4 personas on one laptop
- Free stack + Supabase free tier; SQLite → Postgres via one config flip

**Challenges & risks**
- Outcome data is longitudinal — cold start at launch
- Wage data demands high trust; wrong AI verdicts could discourage learners

**Mitigation strategies**
- Consented backfill (alumni reviews, provider records) gives day-one dashboards
- DPDP-aligned consent log; explainable scores; employer + trainee cross-verified placements

**Speaker line:** "It's not slide-ware — the prototype is running on this laptop right now, and every risk has a designed mitigation."

---

## Slide 5 — IMPACT AND BENEFITS

**Impact on target audience**
- Trainees: honest verdict → free path → verifiable portfolio → jobs
- Recruiters: validated talent with evidence; Providers: courses ranked by outcomes
- Government: longitudinal evidence for skilling spend — placement %, retention, wages

**Benefits**
- Social: follow-up-verified journeys; alumni reviews guide the next cohort
- Economic: money flows to proven-outcome courses; hiring costs drop
- Environmental: light web platform; remote assessments cut rural travel
- Longitudinal: 3/6/12-month check-ins track retention + wage growth

**Speaker line:** "Everyone in the skilling chain sees truth — trainees, recruiters, providers, and the government — for the first time from the same verified data."

---

## Slide 6 — RESEARCH AND REFERENCES

- Problem statement 26135 — Smart India Hackathon 2025
- India Skills Report; Ministry of Skill Development & Entrepreneurship (MSDE) outcome reports
- AICTE internship & placement guidelines; NCS (National Career Service) portal
- Stack docs: supabase.com/docs/auth · prisma.io/docs · fastapi.tiangolo.com
- Reference implementations of consent-based data platforms: DPDP Act 2023 principles

---

## Extended source files

- Slide 2 full-length version: `diagrams/sih-slide-2.md`
- Slides 4–5 full-length versions: `diagrams/sih-slides-4-5.md`
- Deck generator (reproduces the PPTX from the template): `diagrams/fill-deck.py`
