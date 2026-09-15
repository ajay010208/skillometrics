# Fill the SIH 2025 idea template with SkilloMetrics content.
# Keeps template headings, replaces pointer text with real bullets, inserts diagram PNGs,
# fills title-page fields that are safely known, and deletes the instructions slide.
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

SRC = "C:/Users/T-460/Downloads/SIH2025-IDEA-Presentation-Format.pptx"
OUT = "C:/Users/T-460/Downloads/SIH2025-SkilloMetrics-idea.pptx"
PNG = "C:/Users/T-460/OneDrive/Desktop/weather-platform/diagrams/png/"

DARK = RGBColor(0x1A, 0x2B, 0x3C)
ACCENT = RGBColor(0x0E, 0x74, 0x90)

prs = Presentation(SRC)


def set_bullets(tb, sections):
    """Replace a template pointer textbox with heading + bullet sections."""
    tf = tb.text_frame
    tf.clear()
    tf.word_wrap = True
    first = True
    for heading, bullets in sections:
        hp = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        hr = hp.add_run()
        hr.text = heading
        hr.font.bold = True
        hr.font.size = Pt(14)
        hr.font.color.rgb = ACCENT
        for b in bullets:
            p = tf.add_paragraph()
            r = p.add_run()
            r.text = "• " + b
            r.font.size = Pt(11)
            r.font.color.rgb = DARK


def add_pic(slide, path, left, top, width):
    return slide.shapes.add_picture(path, Inches(left), Inches(top), width=Inches(width))


# ---------- Slide 1: title page ----------
s1 = prs.slides[0]
for sh in s1.shapes:
    if sh.has_text_frame and "Problem Statement ID" in sh.text_frame.text:
        tf = sh.text_frame
        lines = {
            "Problem Statement ID": "26135",
            "Problem Statement Title": "Skilling Outcome Tracking Platform",
            "Theme": "Smart Education / Skilling",
            "PS Category": "Software",
            "Team ID": "(fill on portal)",
            "Team Name": "(your registered team name)",
        }
        # rewrite each pointer line, keeping the template structure
        for para in tf.paragraphs:
            t = "".join(r.text for r in para.runs)
            for key, val in lines.items():
                if key in t:
                    if para.runs:
                        para.runs[0].text = f"{key}: {val}"
                        for extra in para.runs[1:]:
                            extra.text = ""
                    break
        break

# ---------- Slide 2: IDEA TITLE / Proposed Solution ----------
s2 = prs.slides[1]
s2.shapes.title.text_frame.clear()
tr = s2.shapes.title.text_frame.paragraphs[0].add_run()
tr.text = "SkilloMetrics — AI Career & Skilling Outcome Platform"
tr.font.bold = True
tr.font.size = Pt(24)
# keep clear of the 'Your Team Name' oval (top-left)
s2.shapes.title.left, s2.shapes.title.top = Inches(1.7), Inches(0.3)
s2.shapes.title.width, s2.shapes.title.height = Inches(8.9), Inches(0.9)

for sh in s2.shapes:
    if sh.has_text_frame and "Proposed Solution" in sh.text_frame.text:
        set_bullets(sh, [
            ("What we built", [
                "A longitudinal skilling-outcomes platform: consent-based trainee records from sign-up to 12 months after placement",
                "AI skill analysis with an honest Reality Check (68% ready — NOT YET, 2/6 requirements met) and week-by-week roadmap of free resources",
            ]),
            ("How it addresses the problem", [
                "Skilling today stops at certificates; nobody measures whether training led to a job that lasted",
                "3/6/12-month follow-ups verify placement, retention and wage growth — the outcome layer India's skilling mission is missing",
            ]),
            ("Innovation & uniqueness", [
                "Verified outcomes, not self-reported claims: employer-confirmed placement + trainee cross-checks",
                "Explainable job-match scores ('why 82%?'), consent-first design, one-click demo personas for every stakeholder",
            ]),
        ])
        # move pointer box up and narrow it; diagram goes right
        sh.left, sh.top, sh.width, sh.height = Inches(0.4), Inches(1.5), Inches(6.2), Inches(5.4)
        sh.text_frame.word_wrap = True

add_pic(s2, PNG + "skillometrics-workflow.png", 6.8, 1.6, 6.2)
cap = s2.shapes.add_textbox(Inches(6.8), Inches(6.55), Inches(6.2), Inches(0.5))
cr = cap.text_frame.paragraphs[0].add_run()
cr.text = "Trainee journey — from sign-up to verified outcome"
cr.font.size = Pt(10)
cr.font.italic = True
cr.font.color.rgb = DARK

# ---------- Slide 3: TECHNICAL APPROACH ----------
s3 = prs.slides[2]
for sh in s3.shapes:
    if sh.has_text_frame and "Technologies" in sh.text_frame.text:
        set_bullets(sh, [
            ("Technology stack", [
                "React 18 + Vite + Tailwind (SPA, 4 persona dashboards) · Express 5 + Prisma · Python FastAPI (AI service)",
                "Supabase Auth: Google / GitHub / LinkedIn OAuth + magic links, JWT with PKCE, JWKS verification",
                "SQLite in dev → Supabase Postgres in production via a single config switch",
            ]),
            ("Methodology", [
                "Consent captured at onboarding → AI analysis → skill verification → placement → outcome tracking",
                "AI quizzes, resume parsing and project validation run with deterministic fallbacks — the demo never breaks",
                "Architecture (right): request path, auth boundary, AI service and data stores",
            ]),
        ])
        sh.left, sh.top, sh.width, sh.height = Inches(0.4), Inches(1.5), Inches(6.2), Inches(5.4)
        sh.text_frame.word_wrap = True

add_pic(s3, PNG + "skillometrics-architecture.png", 6.8, 1.7, 6.2)
cap = s3.shapes.add_textbox(Inches(6.8), Inches(6.45), Inches(6.2), Inches(0.5))
cr = cap.text_frame.paragraphs[0].add_run()
cr.text = "Platform architecture — web, API, AI service, auth boundary, data"
cr.font.size = Pt(10)
cr.font.italic = True
cr.font.color.rgb = DARK

# ---------- Slide 4: FEASIBILITY AND VIABILITY ----------
s4 = prs.slides[3]
for sh in s4.shapes:
    if sh.has_text_frame and "Analysis of the feasibility" in sh.text_frame.text:
        set_bullets(sh, [
            ("Feasibility", [
                "Working prototype runs today: 320+ trainees, 12 states, 4 personas on one laptop",
                "Free stack + Supabase free tier; SQLite → Postgres via one config flip",
            ]),
            ("Challenges & risks", [
                "Outcome data is longitudinal — cold start at launch",
                "Wage data demands high trust; wrong AI verdicts could discourage learners",
            ]),
            ("Mitigation strategies", [
                "Consented backfill (alumni reviews, provider records) gives day-one dashboards",
                "DPDP-aligned consent log; explainable scores; employer + trainee cross-verified placements",
            ]),
        ])
        sh.left, sh.top, sh.width, sh.height = Inches(0.4), Inches(1.5), Inches(12.5), Inches(5.6)
        sh.text_frame.word_wrap = True
        # two-column feel: widen font a touch for readability at full width
        for p in sh.text_frame.paragraphs:
            for r in p.runs:
                if r.font.size and r.font.size.pt == 11:
                    r.font.size = Pt(13)

# ---------- Slide 5: IMPACT AND BENEFITS ----------
s5 = prs.slides[4]
for sh in s5.shapes:
    if sh.has_text_frame and "Potential impact" in sh.text_frame.text:
        set_bullets(sh, [
            ("Impact on target audience", [
                "Trainees: honest verdict → free path → verifiable portfolio → jobs",
                "Recruiters: validated talent with evidence; Providers: courses ranked by outcomes",
                "Government: longitudinal evidence for skilling spend — placement %, retention, wages",
            ]),
            ("Benefits", [
                "Social: follow-up-verified journeys; alumni reviews guide the next cohort",
                "Economic: money flows to proven-outcome courses; hiring costs drop",
                "Environmental: light web platform; remote assessments cut rural travel",
                "Longitudinal: 3/6/12-month check-ins track retention + wage growth",
            ]),
        ])
        sh.left, sh.top, sh.width, sh.height = Inches(0.4), Inches(1.5), Inches(12.5), Inches(5.6)
        sh.text_frame.word_wrap = True
        for p in sh.text_frame.paragraphs:
            for r in p.runs:
                if r.font.size and r.font.size.pt == 11:
                    r.font.size = Pt(13)

# ---------- Slide 6: RESEARCH AND REFERENCES ----------
s6 = prs.slides[5]
for sh in s6.shapes:
    if sh.is_placeholder:
        continue  # keep the template's own title untouched
    if sh.has_text_frame and "reference" in sh.text_frame.text.lower():
        set_bullets(sh, [
            ("Research & references", [
                "Problem statement 26135 — Smart India Hackathon 2025",
                "India Skills Report; Ministry of Skill Development & Entrepreneurship (MSDE) outcome reports",
                "AICTE internship & placement guidelines; NCS (National Career Service) portal",
                "Stack docs: supabase.com/docs/auth · prisma.io/docs · fastapi.tiangolo.com",
                "Reference implementations of consent-based data platforms: DPDP Act 2023 principles",
            ]),
        ])
        sh.left, sh.top, sh.width, sh.height = Inches(0.4), Inches(1.5), Inches(12.5), Inches(5.0)
        sh.text_frame.word_wrap = True
        for p in sh.text_frame.paragraphs:
            for r in p.runs:
                r.font.size = Pt(13)

# ---------- Slide 7: delete instructions slide ----------
xml_slides = prs.slides._sldIdLst
slides = list(xml_slides)
xml_slides.remove(slides[6])

prs.save(OUT)
print("saved", OUT, "slides:", len(prs.slides.__iter__.__self__._sldIdLst))
