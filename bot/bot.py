import asyncio
import logging
import os
from datetime import time as dt_time
from typing import Optional

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    ApplicationBuilder,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    PreCheckoutQueryHandler,
    filters,
)

from config import TELEGRAM_BOT_TOKEN, OPENROUTER_API_KEY, OPENROUTER_MODEL, TIERS, BOT_NAME, BOT_HANDLE, OPERATOR_EMAIL, LANGUAGES, DEFAULT_LANGUAGE
from store import load_user, save_user, increment_usage, reset_daily_limits
from personas import PERSONAS, persona_select_handler
from payments import (
    create_invoice,
    answer_pre_checkout,
    handle_successful_payment,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# ── OpenRouter stub ─────────────────────────────────────────────────────

async def call_openrouter(
    messages: list[dict],
    model: str = OPENROUTER_MODEL,
    api_key: str = OPENROUTER_API_KEY,
) -> str:
    """Send chat completion to OpenRouter and return assistant text."""
    import httpx

    if not api_key or api_key.startswith("YOUR_"):
        return "OpenRouter API key not configured. Please set OPENROUTER_API_KEY."

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tycoon.ai",
        "X-Title": BOT_NAME,
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 1024,
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"] or "(empty response)"
    except Exception as e:
        logger.error("OpenRouter error: %s", e)
        return "Failed to reach AI service. Please try again later."


# ── Handlers ───────────────────────────────────────────────────────────

async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Bilingual onboarding for /start."""
    try:
        user_id = update.effective_user.id
        user = load_user(user_id)

        tier_key = user.get("tier", "starter")
        tier_info = TIERS.get(tier_key, TIERS["starter"])

        daily_count = user.get("daily_count", 0)
        daily_limit = tier_info.get("daily_limit")
        limit_str = str(daily_limit) if daily_limit is not None else "unlimited"

        welcome = (
            f"Selamat datang / Welcome to {BOT_NAME}!\n\n"
            f"Current tier / Plan sekarang: {tier_info['name']}\n"
            f"Daily messages / Mesej hari ini: {daily_count} / {limit_str}\n\n"
            "Commands / Perintah:\n"
            "/start — Show this / Papar mesej ni\n"
            "/persona — Choose mode / Pilih mod\n"
            "/upgrade — Upgrade plan / Naik taraf\n"
            "/help — Help / Bantuan\n\n"
            f"Contact / Hubungi: {OPERATOR_EMAIL}\n"
            f"Bot: {BOT_HANDLE}"
        )

        await update.message.reply_text(welcome)
    except Exception as e:
        logger.exception("start_handler error: %s", e)
        await update.message.reply_text("Something went wrong. Please try again.")


async def upgrade_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show tier options and payment links."""
    try:
        keyboard = []
        for key, info in TIERS.items():
            label = f"{info['name']} — {info['description']}"
            keyboard.append([InlineKeyboardButton(label, callback_data=f"upgrade:{key}")])
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "Choose a plan to upgrade:", reply_markup=reply_markup
        )
    except Exception as e:
        logger.exception("upgrade_handler error: %s", e)
        await update.message.reply_text("Could not load plans. Please try later.")


async def callback_query_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle inline keyboard callbacks (persona selector, upgrade button)."""
    try:
        query = update.callback_query
        await query.answer()
        data = query.data

        if data.startswith("persona:"):
            persona_key = data.split(":", 1)[1]
            if persona_key in PERSONAS:
                user_id = update.effective_user.id
                user = load_user(user_id)
                user["persona"] = persona_key
                save_user(user_id, user)
                persona = PERSONAS[persona_key]
                await query.edit_message_text(
                    f"Persona set to {persona['name']}\n{persona['description']}"
                )
            else:
                await query.edit_message_text("Invalid persona selected.")

        elif data.startswith("upgrade:"):
            tier = data.split(":", 1)[1]
            chat_id = update.effective_chat.id
            try:
                await create_invoice(chat_id, tier, currency="MYR")
            except Exception as e:
                logger.exception("Upgrade callback error: %s", e)
                await query.edit_message_text(
                    "Payment error. Please try again or contact support."
                )
        else:
            await query.edit_message_text("Unknown action.")
    except Exception as e:
        logger.exception("callback_query_handler error: %s", e)


async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Forward user message to LLM after tier/limit check."""
    try:
        user_id = update.effective_user.id
        user = load_user(user_id)

        # Tier enforcement
        tier_key = user.get("tier", "starter")
        tier_info = TIERS.get(tier_key, TIERS["starter"])

        if tier_key == "private":
            await update.message.reply_text(
                "Private tier (local inference) is not available yet.\n"
                "Please upgrade to Standard at /upgrade."
            )
            return

        daily_limit = tier_info.get("daily_limit")
        daily_count = user.get("daily_count", 0)

        if daily_limit is not None and daily_count >= daily_limit:
            await update.message.reply_text(
                f"Daily limit reached ({daily_count}/{daily_limit}).\n"
                "Upgrade at /upgrade for unlimited access."
            )
            return

        # Record usage before LLM call
        increment_usage(user_id)

        # Build conversation history
        persona_key = user.get("persona", "operator")
        persona = PERSONAS.get(persona_key, PERSONAS["operator"])

        messages = [
            {"role": "system", "content": persona["system_prompt"]},
            {"role": "user", "content": update.message.text or ""},
        ]

        response_text = await call_openrouter(messages)
        await update.message.reply_text(response_text)
    except Exception as e:
        logger.exception("message_handler error: %s", e)
        await update.message.reply_text("An error occurred. Please try again.")


async def daily_reset_job(context: ContextTypes.DEFAULT_TYPE):
    """Cron-like daily reset of message counters."""
    try:
        reset_count = reset_daily_limits()
        logger.info("Daily reset job: cleared %d users", reset_count)
    except Exception as e:
        logger.exception("daily_reset_job error: %s", e)


def _schedule_daily_reset(application):
    """Schedule daily reset at midnight UTC."""
    try:
        application.job_queue.run_daily(
            daily_reset_job,
            time=dt_time(hour=0, minute=0),
            name="daily_reset",
        )
    except Exception as e:
        logger.warning("Could not schedule daily reset job: %s", e)


def main():
    try:
        application = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
    except Exception as e:
        logger.error("Failed to build Telegram application: %s", e)
        raise

    # Handlers
    application.add_handler(CommandHandler("start", start_handler))
    application.add_handler(CommandHandler("upgrade", upgrade_handler))
    application.add_handler(CommandHandler("persona", persona_select_handler))
    application.add_handler(PreCheckoutQueryHandler(answer_pre_checkout))
    application.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, handle_successful_payment))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, message_handler))
    application.add_handler(CallbackQueryHandler(callback_query_handler))

    # Schedule cron
    _schedule_daily_reset(application)

    logger.info("Bot started. Polling...")
    application.run_polling()


if __name__ == "__main__":
    main()
