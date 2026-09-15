"""AI Career Counsellor agent.

With an LLM key: tool-calling loop over platform data tools.
Without: intent router that calls the same tools and answers with real data
in templated language — still genuinely useful for the demo.
"""
import re
from typing import Any, Optional

from .llm import chat_json, llm_available

# ---- tools the agent can call (implemented in app.main and injected) ----
# Each tool: name -> (description, fn)

SYSTEM_PROMPT = """You are the SkilloMetrics AI Career Counsellor for Indian students.
You help trainees with: skill gaps, learning roadmaps, job search, interview prep
and company reviews. Be warm, concrete, and encouraging. Use the tool results
returned to you for real numbers. Keep answers under 120 words unless asked more.
When recommending learning, mention platform + duration (e.g. "freeCodeCamp SQL course, ~20h").
Reply with JSON: {"reply": "<your answer>"}"""


def _fmt_skill_list(skills: list[dict]) -> str:
    if not skills:
        return "no skills recorded yet"
    return ", ".join(f"{s['name']} {s['level']}%" for s in sorted(skills, key=lambda x: -x["level"]))


async def agent_reply(message: str, profile: dict, tools: dict[str, Any]) -> dict:
    """Return {"reply", "toolsUsed", "source"}."""
    tools_used: list[str] = []
    tool_results: dict[str, Any] = {}

    # --- intent routing: decide which tools to call (works for both modes) ---
    low = message.lower()

    async def use(name: str, *args) -> Any:
        tools_used.append(name)
        fn = tools[name]["fn"]
        return await fn(*args) if _is_coro_fn(fn) else fn(*args)

    def _is_coro_fn(fn) -> bool:
        import inspect
        return inspect.iscoroutinefunction(fn)

    context = profile.get("trainee") or {}

    if any(k in low for k in ["job", "hire", "opening", "vacancy", "apply"]):
        tool_results["jobs"] = await use("search_jobs", message, profile)
    if any(k in low for k in ["gap", "ready", "readiness", "skill", "weak"]):
        tool_results["skill_profile"] = await use("get_skill_profile", profile)
    if any(k in low for k in ["week", "plan", "roadmap", "next step", "study", "learn", "resource", "course"]):
        tool_results["next_step"] = await use("get_roadmap_next_step", profile)
        tool_results["resources"] = await use("recommend_resources", context.get("targetJob") or "", profile)
    if any(k in low for k in ["review", "company", "interview", "interview question"]):
        m = re.search(r"(?:about|at|for)\s+([A-Z][\w&.\s]+)", message)
        company = m.group(1).strip() if m else ""
        tool_results["reviews"] = await use("get_company_reviews", company)
    if any(k in low for k in ["placement", "stat", "percentage", "dashboard", "why"]):
        tool_results["stats"] = await use("explain_stat", profile)

    # no intents matched -> default: profile + next step
    if not tool_results:
        tool_results["skill_profile"] = await use("get_skill_profile", profile)
        tool_results["next_step"] = await use("get_roadmap_next_step", profile)

    # --- LLM path ---
    if llm_available():
        tool_summary = {
            k: v for k, v in tool_results.items() if v is not None
        }
        payload = {
            "student": profile,
            "tools_used": tools_used,
            "tool_results": _compact(tool_summary),
        }
        data = await chat_json(SYSTEM_PROMPT, f"Student message: {message}\n\nTool results JSON:\n{payload}")
        if data and data.get("reply"):
            return {"reply": data["reply"], "toolsUsed": tools_used, "source": "ai"}

    # --- fallback: templated answer from real tool data ---
    return {"reply": _template_answer(message, tool_results, profile), "toolsUsed": tools_used, "source": "fallback"}


def _compact(obj: Any, depth: int = 0) -> Any:
    """Trim tool results so the LLM prompt stays small."""
    if depth > 3:
        return "…"
    if isinstance(obj, dict):
        return {k: _compact(v, depth + 1) for k, v in list(obj.items())[:12]}
    if isinstance(obj, list):
        return [_compact(x, depth + 1) for x in obj[:6]]
    return obj


def _template_answer(message: str, tr: dict, profile: dict) -> str:
    name = profile.get("name", "there").split(" ")[0]
    parts: list[str] = []

    if "skill_profile" in tr and tr["skill_profile"]:
        sp = tr["skill_profile"]
        parts.append(
            f"Your current profile: {sp.get('targetJob') or 'no target job set yet'}. "
            f"Skills: {_fmt_skill_list(sp.get('skills', []))}. Readiness ≈ {sp.get('readiness', '–')}%."
        )
    if "next_step" in tr and tr["next_step"]:
        ns = tr["next_step"]
        parts.append(f"This week: {ns.get('advice')}")
        if ns.get("resource"):
            r = ns["resource"]
            parts.append(f"Recommended: {r['title']} ({r['platform']}, {r['cost']}, ~{r['durationHours']}h → about {r.get('weeks', '?')} week(s) at your pace).")
    elif "resources" in tr and tr["resources"]:
        rs = tr["resources"][:3]
        if rs:
            parts.append("Recommended resources: " + "; ".join(
                f"{r['title']} ({r['platform']}, {r['cost']}, ~{r['durationHours']}h)" for r in rs
            ))
    if "jobs" in tr and tr["jobs"]:
        jobs = tr["jobs"][:3]
        parts.append("Matching jobs: " + "; ".join(
            f"{j['title']} @ {j['company']} ({j['district']}), {j['score']}% match — ₹{j['salaryMin']:,}–{j['salaryMax']:,}" for j in jobs
        ))
    if "reviews" in tr and tr["reviews"]:
        revs = tr["reviews"][:2]
        parts.append("What placed students say: " + "; ".join(
            f"{r['company']} ★{r['overallRating']} — {r['tip']}" for r in revs
        ))
    if "stats" in tr and tr["stats"]:
        st = tr["stats"]
        parts.append(f"Platform stats: {st.get('placementPct', '–')}% placement, avg salary ₹{st.get('avgSalary', 0):,}, retention 3m {st.get('retention3', '–')}%.")

    if not parts:
        parts.append("I can help with your skill gaps, learning plan, job matches and company reviews. Try: \"what should I do this week?\"")

    return f"Hi {name}! " + " ".join(parts)
