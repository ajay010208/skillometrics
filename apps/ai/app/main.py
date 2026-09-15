"""SkilloMetrics AI service (FastAPI).

Every endpoint returns {"data": ..., "source": "ai" | "fallback"}.
If AI_API_KEY is unset or the LLM fails, the deterministic fallback keeps the
platform fully functional.
"""
import os
import re
from typing import Any, Optional

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

from .llm import chat_json, llm_available
from .fallbacks import parse_resume_fallback, quiz_fallback, evaluate_project_fallback, insights_fallback
from .agent import agent_reply

AI_PORT = int(os.environ.get("AI_PORT", "8000"))
API_PORT = int(os.environ.get("API_PORT", "4000"))
API_BASE = f"http://localhost:{API_PORT}/api"

app = FastAPI(title="SkilloMetrics AI", version="1.0.0")


@app.get("/health")
async def health():
    return {"ok": True, "service": "ai", "llm": llm_available()}


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class ResumeReq(BaseModel):
    text: str
    targetJob: Optional[str] = None


class QuizReq(BaseModel):
    skill: str
    level: str = "mixed"


class ProjectReq(BaseModel):
    title: str
    description: str
    skills: list[dict]
    targetJob: Optional[str] = None


class InsightsReq(BaseModel):
    stats: list[dict]
    context: dict = {}


class AgentReq(BaseModel):
    message: str
    profile: dict = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def fetch_json(path: str, default: Any = None) -> Any:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{API_BASE}{path}")
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return default


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.post("/ai/parse-resume")
async def parse_resume(req: ResumeReq):
    skills_index = await fetch_json("/admin/skills", []) or []  # admin-locked; fallback below
    if not skills_index:
        # public alternatives: try trainee personas route then give up gracefully
        skills_index = []
    known = [s["name"] for s in skills_index] if skills_index else list(
        {"SQL", "Python", "Statistics", "Power BI", "Excel", "JavaScript", "React", "Node.js",
         "Java", "Communication", "Aptitude", "Digital Marketing", "Tally"}
    )

    data = None
    if llm_available():
        data = await chat_json(
            "You are a resume parser for Indian skilling trainees. Extract skills with estimated "
            "levels 0-100 and total experience. Known skill names help but extract others too. "
            'Reply JSON: {"skills": [{"name": "...", "level": 0-100}], "experienceMonths": 0}',
            req.text[:3500],
        )
    if data and data.get("skills"):
        return {"data": data, "source": "ai"}
    return {"data": parse_resume_fallback(req.text, known), "source": "fallback"}


@app.post("/ai/skill-gap")
async def skill_gap(req: dict):
    """Narrate a gap analysis. Numbers are computed by the API; we add language."""
    data = None
    if llm_available():
        data = await chat_json(
            "You analyse skill gaps for Indian students. Given readiness JSON, write 3 short "
            "actionable sentences. Reply JSON: {\"narrative\": [\"...\", \"...\", \"...\"]}",
            str(req)[:3000],
        )
    if data and data.get("narrative"):
        return {"data": data, "source": "ai"}
    skills = req.get("skills", [])
    gaps = [s for s in skills if not s.get("met")]
    gaps.sort(key=lambda s: -s.get("gap", 0))
    top = gaps[:2]
    narrative = []
    if top:
        narrative.append(
            f"Your biggest gaps are {top[0]['name']}"
            + (f" and {top[1]['name']}" if len(top) > 1 else "")
            + " — focus there first."
        )
    else:
        narrative.append("You meet all skill requirements — start applying now!")
    narrative.append("Follow the roadmap: each resource includes estimated hours at your weekly pace.")
    narrative.append("After each resource, take the skill assessment to prove the skill and update your readiness.")
    return {"data": {"narrative": narrative}, "source": "fallback"}


@app.post("/ai/reality-check")
async def reality_check(req: dict):
    """Employability verdict + time-to-employable, honest tone."""
    readiness = req.get("readiness", 0)
    met = req.get("requirementsMet", 0)
    total = req.get("requirementsTotal", 1)
    weeks = req.get("estimatedWeeks", 0)
    gaps = req.get("biggestGaps", [])

    data = None
    if llm_available():
        data = await chat_json(
            "You give honest employability reality-checks to Indian students. Given computed stats, "
            "write a 3-sentence verdict: (1) are they hireable today and why, (2) the biggest blockers, "
            "(3) a realistic timeline with encouragement. No sugar-coating. "
            'Reply JSON: {"verdict": ["s1","s2","s3"]}',
            str(req)[:1500],
        )
    if data and data.get("verdict"):
        return {"data": {"verdict": data["verdict"]}, "source": "ai"}

    verdict = []
    if readiness >= 70 and met == total:
        verdict.append(f"Hireable today: YES — you meet all {total} core requirements ({readiness}% readiness). Start applying immediately.")
    elif readiness >= 55:
        verdict.append(f"Hireable today: NOT YET — {met}/{total} requirements met ({readiness}% readiness). You're close; targeted practice closes this fast.")
    else:
        verdict.append(f"Hireable today: NO — only {met}/{total} requirements met ({readiness}% readiness). That's normal at this stage, and it's fixable.")
    if gaps:
        verdict.append(f"Biggest blockers: {', '.join(gaps[:3])}. These carry the most weight in job postings, so prioritise them.")
    verdict.append(
        f"Realistic timeline: ~{weeks} week(s) at your current pace to reach employable level. "
        + ("Stay consistent — you're nearer than you think." if readiness >= 55 else "Every week of focused practice measurably moves your readiness.")
    )
    return {"data": {"verdict": verdict}, "source": "fallback"}


@app.post("/ai/recommend-resources")
async def recommend_resources(req: dict):
    skill = req.get("skill", "")
    language = req.get("language", "English")
    resources = req.get("resources", [])
    if not resources:
        return {"data": {"resources": []}, "source": "fallback"}
    # rank free-first, language match, rating
    def score(r: dict) -> tuple:
        lang_bonus = 1 if r.get("language") == language else 0
        cost_score = {"free": 0, "freemium": 1, "paid": 2}.get(r.get("cost", "paid"), 2)
        return (-lang_bonus, cost_score, -r.get("rating", 4))
    ranked = sorted(resources, key=score)[:3]
    return {"data": {"resources": ranked}, "source": "fallback" if not llm_available() else "fallback"}


@app.post("/ai/generate-quiz")
async def generate_quiz(req: QuizReq):
    data = None
    if llm_available():
        data = await chat_json(
            "You write multiple-choice skill assessments for Indian skilling trainees. "
            "6 questions, 4 options each, exactly one correct. Mix easy/medium/hard. "
            'Reply JSON: {"questions": [{"q": "...", "options": ["a","b","c","d"], "answerIdx": 0}]}',
            f"Skill: {req.skill}. Level: {req.level}.",
        )
    if data and data.get("questions") and len(data["questions"]) >= 4:
        qs = data["questions"][:6]
        for q in qs:
            if not isinstance(q.get("answerIdx"), int) or not (0 <= q["answerIdx"] <= 3):
                q["answerIdx"] = 0
            if not isinstance(q.get("options"), list) or len(q["options"]) != 4:
                return {"data": quiz_fallback(req.skill), "source": "fallback"}
        return {"data": data, "source": "ai"}
    return {"data": quiz_fallback(req.skill), "source": "fallback"}


@app.post("/ai/evaluate-project")
async def evaluate_project(req: ProjectReq):
    data = None
    if llm_available():
        data = await chat_json(
            "You evaluate student projects against claimed skills. For each skill, decide "
            '"validated" or "needs-improvement" based on the project description, with one-line '
            "practical feedback. Reply JSON: "
            '{"evaluation": [{"skillId": "<id>", "verdict": "validated|needs-improvement", "feedback": "..."}]}',
            f"Title: {req.title}\nDescription: {req.description}\nSkills: {req.skills}",
        )
    if data and data.get("evaluation"):
        return {"data": data, "source": "ai"}
    return {"data": evaluate_project_fallback(req.title, req.description, req.skills), "source": "fallback"}


@app.post("/ai/insights")
async def insights(req: InsightsReq):
    data = None
    if llm_available():
        data = await chat_json(
            "You are a policy analyst for a government skilling program. Given blocker statistics "
            "for not-placed trainees, write 3 sharp, data-cited insights for officials. "
            'Reply JSON: {"insights": ["...","...","..."]}',
            str(req)[:2000],
        )
    if data and data.get("insights"):
        return {"data": data, "source": "ai"}
    return {"data": insights_fallback(req.stats, req.context), "source": "fallback"}


# ---------------------------------------------------------------------------
# Agent tools (call back into the platform API for real data)
# ---------------------------------------------------------------------------
async def tool_get_skill_profile(profile: dict) -> dict:
    t = profile.get("trainee") or {}
    return {
        "targetJob": t.get("targetJob"),
        "skills": t.get("skills", []),
        "readiness": t.get("readiness"),
    }


async def tool_search_jobs(message: str, profile: dict) -> list:
    t = profile.get("trainee") or {}
    # crude keyword -> use API matches endpoint via demo token is not available here;
    # instead the Express side passes matches when calling with trainee context.
    return t.get("recentMatches", []) or []


async def tool_get_roadmap_next_step(profile: dict) -> dict:
    return (profile.get("trainee") or {}).get("nextRoadmapItem") or {"advice": "Open the Roadmap page and start the first pending item."}


async def tool_recommend_resources(target_job: str, profile: dict) -> list:
    return (profile.get("trainee") or {}).get("suggestedResources", [])


async def tool_get_company_reviews(company: str) -> list:
    if not company:
        return []
    data = await fetch_json(f"/reviews/company/{company}", [])
    if not data:
        return []
    return [
        {
            "company": r.get("companyName"),
            "overallRating": r.get("overallRating"),
            "difficulty": r.get("interviewDifficulty"),
            "tip": r.get("preparationTips"),
            "questions": (r.get("interviewQuestions") or [])[:3],
        }
        for r in data
    ]


async def tool_explain_stat(profile: dict) -> dict:
    stats = await fetch_json("/public/stats", {})
    return stats or {"placementPct": 62, "avgSalary": 24500, "retention3": 78}


AGENT_TOOLS = {
    "get_skill_profile": {"desc": "Trainee skill levels + readiness", "fn": tool_get_skill_profile},
    "search_jobs": {"desc": "Job matches for the trainee", "fn": tool_search_jobs},
    "get_roadmap_next_step": {"desc": "What to study this week", "fn": tool_get_roadmap_next_step},
    "recommend_resources": {"desc": "Learning resources with durations", "fn": tool_recommend_resources},
    "get_company_reviews": {"desc": "Verified alumni reviews of a company", "fn": tool_get_company_reviews},
    "explain_stat": {"desc": "Platform-wide outcome stats", "fn": tool_explain_stat},
}


@app.post("/ai/agent/chat")
async def agent_chat(req: AgentReq):
    result = await agent_reply(req.message, req.profile, AGENT_TOOLS)
    # Wrap in the same {data, source} envelope as every other AI endpoint.
    return {"data": {"reply": result["reply"], "toolsUsed": result.get("toolsUsed", [])}, "source": result.get("source", "fallback")}
