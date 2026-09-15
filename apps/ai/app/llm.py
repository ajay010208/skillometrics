"""LLM client: OpenAI-compatible + Gemini, with availability probing.

If AI_API_KEY is set we call the LLM; every caller must handle failure and
use the deterministic fallback instead (source: "fallback").
"""
import os
import re
import json
from typing import Any, Optional

import httpx

AI_API_KEY = os.environ.get("AI_API_KEY", "").strip()
AI_BASE_URL = os.environ.get("AI_BASE_URL", "https://api.openai.com/v1").strip()
AI_MODEL = os.environ.get("AI_MODEL", "gpt-4o-mini").strip()
AI_PROVIDER = os.environ.get("AI_PROVIDER", "openai").strip().lower()


def llm_available() -> bool:
    return bool(AI_API_KEY)


async def chat_json(system: str, user: str, max_tokens: int = 1200) -> Optional[dict]:
    """Ask the LLM for a JSON object. Returns None on any failure."""
    if not AI_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            if AI_PROVIDER == "gemini":
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{AI_MODEL}:generateContent?key={AI_API_KEY}"
                payload = {
                    "system_instruction": {"parts": [{"text": system}]},
                    "contents": [{"parts": [{"text": user}]}],
                    "generationConfig": {"response_mime_type": "application/json", "maxOutputTokens": max_tokens},
                }
                r = await client.post(url, json=payload)
                r.raise_for_status()
                text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                return _extract_json(text)
            # OpenAI-compatible
            r = await client.post(
                f"{AI_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {AI_API_KEY}"},
                json={
                    "model": AI_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "response_format": {"type": "json_object"},
                    "max_tokens": max_tokens,
                    "temperature": 0.4,
                },
            )
            r.raise_for_status()
            text = r.json()["choices"][0]["message"]["content"]
            return _extract_json(text)
    except Exception:
        return None


def _extract_json(text: str) -> Optional[dict]:
    text = text.strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
