#!/usr/bin/env python3
"""
Data retention cron script.

Removes conversation records older than 90 days from a JSON file.
Reads from C:\\Users\\Najmi\\data\\conversations.json, which may be:
  - a JSON array of dicts, each containing an ISO-format 'timestamp' field
  - missing
  - empty

Outputs a summary line:
  Pruned {X} old records. {Y} remaining.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

FILE_PATH = Path(r'C:\Users\Najmi\data\conversations.json')
RETENTION_DAYS = 90


def load_records(path: Path) -> list:
    """
    Load conversation records from a JSON file.

    Args:
        path: Path to the JSON file.

    Returns:
        list of dicts with at least a 'timestamp' field.
    """
    if not path.exists() or path.stat().st_size == 0:
        return []
    try:
        with path.open('r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        # If the file is a dict rather than a list, wrap it so we can still process it
        if isinstance(data, dict):
            return [data]
        return []
    except (json.JSONDecodeError, OSError):
        return []


def prune_old(records: list, retention_days: int) -> tuple:
    """
    Filter out records older than the retention window.

    Args:
        records: List of conversation dicts.
        retention_days: Number of days to keep.

    Returns:
        (pruned_count, kept_records)
    """
    if not records:
        return 0, records

    cutoff = datetime.now(timezone.utc) - __import__('datetime').timedelta(days=retention_days)
    kept = []
    pruned = 0

    for rec in records:
        # Expect str timestamp; fall back to keeping if parse fails
        ts_raw = rec.get('timestamp')
        if not isinstance(ts_raw, str):
            kept.append(rec)
            continue
        try:
            ts = datetime.fromisoformat(ts_raw)
            # If naive, assume UTC for comparison
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            if ts >= cutoff:
                kept.append(rec)
            else:
                pruned += 1
        except (ValueError, TypeError):
            # Keep records with unparseable timestamps to avoid accidental data loss
            kept.append(rec)

    return pruned, kept


def main() -> int:
    FILE_PATH.parent.mkdir(parents=True, exist_ok=True)

    records = load_records(FILE_PATH)
    pruned, kept = prune_old(records, RETENTION_DAYS)

    try:
        with FILE_PATH.open('w', encoding='utf-8') as f:
            json.dump(kept, f, indent=2) if kept else f.write('[]')
    except OSError as e:
        print(f"Failed to write pruned file: {e}", file=sys.stderr)
        return 1

    print(f"Pruned {pruned} old records. {len(kept)} remaining.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
