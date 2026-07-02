"""
Module 5 – AI Customer Feedback Analysis.

Performs sentiment analysis, summary generation, and issue extraction on
customer reviews using the LLM.
"""
from app.services.ai_client import chat_completion_json

SYSTEM_PROMPT = """You are a customer feedback analysis engine for a restaurant.
Given a customer review, analyze it and respond ONLY with a JSON object with exactly these keys:

{
  "sentiment": "Positive" | "Negative" | "Neutral" | "Mixed",
  "summary": string,          // one or two sentence summary of the review
  "issues": string[]          // short list of specific issues mentioned (e.g. "Slow service", "Cold food"). Empty array if none.
}

Do not include any text outside the JSON object.
"""


async def analyze_feedback(review_text: str) -> dict:
    user_prompt = f'Customer review: "{review_text}"'
    result = await chat_completion_json(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.2,
        max_tokens=300,
    )

    issues = result.get("issues")
    if not isinstance(issues, list):
        issues = []

    return {
        "sentiment": result.get("sentiment") or "Neutral",
        "summary": result.get("summary") or "",
        "issues": [str(i) for i in issues],
    }
