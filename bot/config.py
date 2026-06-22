import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

LANGUAGES = ["en", "ms"]  # English + Malay default
DEFAULT_LANGUAGE = "en"
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "YOUR_OPENROUTER_API_KEY")
OPENROUTER_MODEL = "anthropic/claude-3-haiku-20240307"

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
USERS_FILE = DATA_DIR / "users.json"
ENCRYPTED_STORE_PATH = BASE_DIR.parent / "launch" / "encrypted_store.py"

# Ensure data dir exists
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Tier definitions ──────────────────────────────────────────────────
TIERS = {
    "starter": {
        "name": "Starter",
        "daily_limit": 50,
        "price_myr": 4.90,
        "price_idr": 18000,
        "description": "50 messages per day. Perfect for trying out.",
    },
    "standard": {
        "name": "Standard",
        "daily_limit": None,  # unlimited
        "price_myr": 12.90,
        "price_idr": 49000,
        "description": "Unlimited messages. Best value.",
    },
    "private": {
        "name": "Private",
        "daily_limit": None,
        "price_myr": 49.90,
        "price_idr": 199000,
        "description": "Local inference. Disabled for now. Contact us to enable.",
        "disabled": True,
    },
}

# ── Currency mapping ──────────────────────────────────────────────────
CURRENCY_SYMBOLS = {
    "MYR": "RM",
    "IDR": "IDR",
}

# ── Operator ──────────────────────────────────────────────────────────
OPERATOR_EMAIL = "support@tycoon.ai"
