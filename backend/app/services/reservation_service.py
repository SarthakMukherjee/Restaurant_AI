"""
Module 4 – AI Reservation Booking Assistant.

Extracts intent, time, day, and (optionally) party size from a natural-language
reservation request. No actual booking/table allocation occurs (per MVP scope).
"""
from app.services.ai_client import chat_completion_json

SYSTEM_PROMPT = """You are an intent-recognition engine for a restaurant reservation assistant.
Extract structured booking details from the customer's natural-language message.

Respond ONLY with a JSON object with exactly these keys:
{
  "intent": "Reservation" | "Cancellation" | "Modification" | "Unclear",
  "time": string or null,        // e.g. "7:00 PM", null if not mentioned
  "day": string or null,         // e.g. "Friday", "Tomorrow", "2026-07-05", null if not mentioned
  "party_size": string or null,  // e.g. "4 people", null if not mentioned
  "confirmation_message": string // a short natural-language confirmation summarizing what was understood
}

Do not include any text outside the JSON object.
"""


async def extract_reservation_details(text: str) -> dict:
    user_prompt = f'Customer message: "{text}"'
    result = await chat_completion_json(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.1,
        max_tokens=300,
    )

    return {
        "intent": result.get("intent") or "Unclear",
        "time": result.get("time"),
        "day": result.get("day"),
        "party_size": result.get("party_size"),
        "confirmation_message": result.get("confirmation_message")
        or "Reservation request recognized.",
    }
