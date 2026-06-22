import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from config import USERS_FILE, ENCRYPTED_STORE_PATH

logger = logging.getLogger(__name__)


# Try to import encrypted_store from launch/ if available
_encrypted_store = None
try:
    launch_dir = str(ENCRYPTED_STORE_PATH.parent)
    if launch_dir not in sys.path:
        sys.path.append(launch_dir)
    import encrypted_store  # type: ignore
    _encrypted_store = encrypted_store
    logger.info("Loaded encrypted_store from %s", launch_dir)
except Exception as e:
    logger.warning("encrypted_store not available, falling back to plain JSON: %s", e)


def _load_all_users() -> Dict[str, Dict[str, Any]]:
    try:
        if USERS_FILE.exists():
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.exception("Failed to load users file: %s", e)
    return {}


def _save_all_users(data: Dict[str, Dict[str, Any]]) -> None:
    try:
        USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.exception("Failed to save users file: %s", e)
        raise


def load_user(user_id: int) -> Dict[str, Any]:
    all_users = _load_all_users()
    uid = str(user_id)
    user = all_users.get(uid)
    if not user:
        user = {
            "user_id": user_id,
            "tier": "starter",
            "paid_tier": None,
            "paid_expires_at": None,
            "persona": "operator",
            "daily_count": 0,
            "last_reset": datetime.utcnow().strftime("%Y-%m-%d"),
            "created_at": datetime.utcnow().isoformat(),
        }
        all_users[uid] = user
        _save_all_users(all_users)
    return user


def save_user(user_id: int, data: Dict[str, Any]) -> None:
    all_users = _load_all_users()
    all_users[str(user_id)] = data
    _save_all_users(all_users)


def increment_usage(user_id: int) -> int:
    user = load_user(user_id)
    user["daily_count"] = user.get("daily_count", 0) + 1
    save_user(user_id, user)
    return user["daily_count"]


def reset_daily_limits() -> int:
    all_users = _load_all_users()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    reset_count = 0
    for uid, user in list(all_users.items()):
        last = user.get("last_reset")
        if last != today:
            user["daily_count"] = 0
            user["last_reset"] = today
            all_users[uid] = user
            reset_count += 1
    if reset_count:
        _save_all_users(all_users)
    logger.info("Daily reset: cleared %d users", reset_count)
    return reset_count


def mark_paid(user_id: int, tier: str, expires_at: str) -> None:
    user = load_user(user_id)
    user["paid_tier"] = tier
    user["paid_expires_at"] = expires_at
    user["tier"] = tier
    save_user(user_id, user)
    logger.info("User %s marked as paid tier=%s", user_id, tier)
