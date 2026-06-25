import datetime
import logging
from typing import Optional

from telegram import LabeledPrice, Update
from telegram.ext import ContextTypes

from config import TIERS, CURRENCY_SYMBOLS

logger = logging.getLogger(__name__)


async def create_invoice(chat_id: int, tier: str, currency: str = "MYR"):
    """Send a Telegram invoice for a given tier."""
    try:
        tier_info = TIERS.get(tier)
        if not tier_info:
            raise ValueError(f"Unknown tier: {tier}")

        symbol = CURRENCY_SYMBOLS.get(currency, currency)
        price_val = tier_info.get(f"price_{currency.lower()}")
        if price_val is None:
            raise ValueError(f"Currency {currency} not supported for tier {tier}")

        prices = [LabeledPrice(label=f"{tier_info['name']} Plan", amount=int(price_val * 100))]

        payload = f"tier:{tier}"
        title = f"Upgrade to {tier_info['name']} Plan"
        description = tier_info["description"]

        await ContextTypes.DEFAULT_TYPE.bot.send_invoice(
            chat_id=chat_id,
            title=title,
            description=description,
            payload=payload,
            provider_token="",  # Set via env / config in production
            currency=currency,
            prices=prices,
            need_name=False,
            need_phone_number=False,
            need_email=False,
            need_shipping_address=False,
            is_flexible=False,
        )
    except Exception as e:
        logger.exception("Failed to create invoice: %s", e)
        raise


async def answer_pre_checkout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Auto-approve Telegram pre-checkout queries."""
    try:
        query = update.pre_checkout_query
        await query.answer(ok=True)
    except Exception as e:
        logger.exception("Pre-checkout error: %s", e)
        await query.answer(ok=False, error_message="Payment error. Please try again.")


async def handle_successful_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mark user tier as paid after successful Telegram payment."""
    try:
        user_id = update.effective_user.id
        successful_payment = update.message.successful_payment
        payload = successful_payment.invoice_payload

        tier = payload.split(":")[-1] if ":" in payload else "starter"

        from store import mark_paid
        from config import TIERS

        tier_info = TIERS.get(tier)
        if not tier_info:
            raise ValueError(f"Invalid tier in payload: {tier}")

        expires_at = (
            datetime.datetime.utcnow() + datetime.timedelta(days=30)
        ).isoformat()

        mark_paid(user_id, tier=tier, expires_at=expires_at)

        await update.message.reply_text(
            f"✅ Payment successful! You are now on the *{tier_info['name']}* plan.\n"
            f"Expires: {expires_at[:10]}.",
            parse_mode="Markdown",
        )
    except Exception as e:
        logger.exception("Failed to handle successful payment: %s", e)
        await update.message.reply_text(
            "⚠️ Payment received but we failed to update your account. Please contact support."
        )


def stripe_checkout_link(tier: str) -> str:
    """Placeholder for Stripe MY checkout link generation."""
    return f"https://checkout.stripe.com/pending/{tier}"


def fpx_payment_link(tier: str) -> str:
    """Placeholder for FPX payment link generation."""
    return f"https://fpx-payment.example/pay/{tier}"
