# SIH slide content — SkilloMetrics (PS 26135)

Paste-ready bullets for slides 4 and 5. Keep the template's pointer headings; bullets are sized for the template layout (no paragraphs, per SIH rules).

---

## Slide 4 — FEASIBILITY AND VIABILITY

### Analysis of the feasibility of the idea
- Fully working prototype already running: 320+ trainee records, 12 states, 4 live personas (trainee / recruiter / provider / govt admin)
- 100% free, off-the-shelf stack — React, Express, FastAPI, Supabase free tier; zero licensing cost to scale
- Runs on a laptop today (SQLite) and upgrades to managed Postgres with one config flip — no rewrite
- AI features degrade gracefully: with no API key, deterministic engines give the same demo-quality answers
- Built and demoable by a small team in a hackathon window — the same architecture serves production

### Potential challenges and risks
- Outcome data is longitudinal (3/6/12-month follow-ups) — value grows over time, cold-start at launch
- Trainee consent and personal data (employment, wages) = high trust bar; a breach would be fatal to adoption
- Placement data from recruiters may be incomplete or biased toward responsive employers
- AI skill-assessment accuracy: wrong "Reality Check" verdicts could discourage genuine learners
- State-wide scale: multilingual content and low-bandwidth access in rural districts

### Strategies for overcoming these challenges
- Seed history with consented backfill: alumni reviews + provider records make day-one dashboards meaningful
- Consent-first architecture (opt-in tracking, auditable consent log) aligned with DPDP Act principles; Supabase auth + JWT, no passwords stored
- Placement verification via employer confirmation + trainee follow-ups cross-check, not self-report alone
- Explainable scoring ("why 82%?") + honest "NOT YET" verdicts with a free-resource path — accuracy with dignity
- Progressive web app, offline-friendly roadmaps, Hindi/English first, more languages later

---

## Slide 5 — IMPACT AND BENEFITS

### Potential impact on the target audience
- Trainees: honest skill-gap verdicts → free learning path → verifiable portfolio → jobs; no more blind training spend
- Recruiters: search validated talent by skill/state with evidence (projects, assessments, reviews) — shorter hiring cycles
- Training providers: real outcome data shows which courses actually place graduates; curriculum signals
- Government: first longitudinal evidence layer for skilling spend — placement %, retention, wage growth by state/scheme

### Benefits of the solution
- Social: skill journeys verified by follow-ups, not certificates; alumni reviews guide the next learner cohort
- Economic: training money flows to courses with proven outcomes; hiring cost drops with pre-validated talent pools
- Environmental: resource-light web platform; remote assessments cut travel for tier-3/rural candidates
- Governance: consent-audited, outcome-verified data replaces anecdotal placement claims in public reporting
- Longitudinal: 3/6/12-month check-ins measure job retention and wage progression — the metric skilling has been missing

---

### Speaker notes (not for slides)
- Slide 4 one-liner: "It's not a slide-ware idea — the prototype is running on this laptop right now, and every risk has a designed mitigation."
- Slide 5 one-liner: "Everyone in the skilling chain sees truth: trainees, recruiters, providers, and the government — for the first time from the same verified data."
