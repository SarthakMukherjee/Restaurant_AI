"""
Module 3 – AI Menu Recommendation.

Feeds the current menu + ratings, along with the user's natural-language
query, to the LLM and returns a natural-language recommendation.
"""
from app.models.menu_item import MenuItem
from app.services.ai_client import chat_completion

SYSTEM_PROMPT = """You are a friendly restaurant assistant helping customers choose food.
You will be given the restaurant's current menu (with ratings) and a customer request.

Rules:
- Only recommend dishes that appear in the provided menu.
- Prefer higher-rated dishes, but respect any stated preference (spice level, dietary need, category, budget).
- If the user's preference cannot be matched by anything on the menu, say so honestly and suggest the closest alternative.
- Keep the response conversational, concise (2-4 sentences), and mention specific dish names with their rating.
- Do not invent dishes, prices, or ratings that are not in the menu provided.
"""


def _format_menu(items: list[MenuItem]) -> str:
    lines = []
    for item in items:
        if not item.is_available:
            continue
        lines.append(
            f"- {item.name} | Category: {item.category} | Rating: {float(item.rating):.1f}/5 "
            f"| Price: ₹{float(item.price):.2f} | {item.description or 'No description'}"
        )
    return "\n".join(lines) if lines else "(menu is currently empty)"


async def get_recommendation(query: str, menu_items: list[MenuItem]) -> str:
    menu_text = _format_menu(menu_items)
    user_prompt = f"Current Menu:\n{menu_text}\n\nCustomer request: \"{query}\"\n\nRecommend the best dish(es)."
    return await chat_completion(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.5,
        max_tokens=300,
    )
