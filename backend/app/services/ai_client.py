"""
Thin wrapper around the GROQ chat completions API, shared by all AI modules
(menu recommendation, reservation assistant, feedback analysis).
"""
import json
import logging

from groq import AsyncGroq

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to your .env file to enable AI features."
            )
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client


async def chat_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.4,
    max_tokens: int = 600,
    json_mode: bool = False,
) -> str:
    """
    Calls the GROQ chat completion endpoint and returns the raw text response.
    """
    client = get_groq_client()

    kwargs: dict = dict(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


async def chat_completion_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 600,
) -> dict:
    """
    Calls GROQ with JSON mode enabled and parses the result. Falls back to
    a best-effort parse if the model wraps the JSON in extra text.
    """
    raw = await chat_completion(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        json_mode=True,
    )
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("GROQ JSON parse failed, attempting substring extraction. Raw: %s", raw)
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Could not parse JSON from GROQ response: {raw[:200]}")
