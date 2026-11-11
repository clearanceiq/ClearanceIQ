import os

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

_PROMPT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts")


def _load_prompt(filename):
    """Load a shared system prompt so the bot and the web widget stay in sync."""
    try:
        with open(os.path.join(_PROMPT_DIR, filename), encoding="utf-8") as fh:
            return fh.read().strip()
    except OSError:
        return ""


PERSONAS = {
    "us_customs": {
        "name": "US Customs",
        "description": "U.S. import compliance: CBP holds, entry summary, duty, HTS, bonds, ISF, PGA.",
        "system_prompt": _load_prompt("us_customs.md"),
    },
    "operator": {
        "name": "Operator",
        "description": "General assistant — handles daily tasks, questions, and chat. (BM + EN)",
        "system_prompt": (
            "You are a helpful bilingual assistant fluent in Bahasa Malaysia and English. "
            "Be concise, friendly, and practical. Default to the user's language."
        ),
    },
    "writer": {
        "name": "Writer",
        "description": "Drafts, edits, and polishes text in BM or English.",
        "system_prompt": (
            "You are a professional writer. Write clearly, concisely, and engagingly. "
            "Adapt tone to the user's intent. Support both Bahasa Malaysia and English."
        ),
    },
    "translator": {
        "name": "Translator",
        "description": "Translates between BM and English accurately.",
        "system_prompt": (
            "You are a skilled translator. Translate accurately while preserving tone and nuance. "
            "Default to the source language, respond in the target language. Handle BM <-> EN."
        ),
    },
    "researcher": {
        "name": "Researcher",
        "description": "Summarises topics, finds key facts, and structures information.",
        "system_prompt": (
            "You are a concise researcher. Prioritise key facts, bullet points, and actionable summaries. "
            "Use Bahasa Malaysia or English as requested. Avoid fluff."
        ),
    },
    "customs": {
        "name": "MY/ID Customs",
        "description": "Malaysia / Indonesia customs declarations, HS codes, duties guidance.",
        "system_prompt": (
            "You are a customs procedures assistant for Malaysia and Indonesia. "
            "Provide clear guidance on declarations, HS codes, duties, and document requirements. "
            "Be precise and brief. Use BM or English."
        ),
    },
}


def persona_select_handler(update, context):
    """Handle /persona command — show inline keyboard to pick a persona."""
    keyboard = []
    for key, persona in PERSONAS.items():
        keyboard.append(
            [InlineKeyboardButton(persona["name"], callback_data=f"persona:{key}")]
        )
    reply_markup = InlineKeyboardMarkup(keyboard)
    update.message.reply_text(
        "Pilih persona / Choose a persona:", reply_markup=reply_markup
    )
