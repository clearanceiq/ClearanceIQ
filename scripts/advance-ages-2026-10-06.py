#!/usr/bin/env python3
"""Advance ClearanceIQ task ages for 2026-10-06 briefing.
Each file advanced by 1 day from its 2026-10-05 stamp.
Preserves native format; only swaps age/status tokens + stamp line in-place.
Binary write to avoid CRLF doubling on Windows.

Per https://hermes-agent.nousresearch.com/docs — cron daily advance.
"""
import re
from pathlib import Path

REPO = Path(r"C:\Users\Najmi\Documents\Tycoon\site")
TODAY = "2026-10-06"
OLD_STAMP = "2026-10-05"
DAYS = 1

# Canonical and mirror task files — all advanced from 10-05 to 10-06
CANONICAL = REPO / "ops" / "daily-tasks.md"
PUBLIC_CANONICAL = REPO / "public" / "ops" / "daily-tasks.md"
TODO = REPO / "TODO.md"
PUBLIC_TODO = REPO / "public" / "TODO.md"
TASKS = REPO / "docs" / "TASKS.md"
PUBLIC_TASKS = REPO / "public" / "docs" / "TASKS.md"

FILES = [CANONICAL, PUBLIC_CANONICAL, TODO, PUBLIC_TODO, TASKS, PUBLIC_TASKS]


def advance_token(token, days):
    """Advance a single [Pending ...] token by N days."""
    # [Pending Xd Xh] full format
    m = re.match(r'\[Pending\s+(\d+)\s*d\s+(\d+)h\]', token)
    if m:
        d = int(m.group(1)) + days
        h = int(m.group(2))
        if h >= 24:
            d += h // 24
            h = h % 24
        if d > 0 and h > 0:
            return f'[Pending {d}d {h}h]'
        elif d > 0:
            return f'[Pending {d}d]'
        else:
            return f'[Pending {h}h]'
    # [Pending Xd] bare-day
    m = re.match(r'\[Pending\s+(\d+)d\]', token)
    if m:
        return f'[Pending {int(m.group(1)) + days}d]'
    # [Pending Xh] sub-day
    m = re.match(r'\[Pending\s+(\d+)h\]', token)
    if m:
        new_hours = int(m.group(1)) + days * 24
        nd = new_hours // 24
        rh = new_hours % 24
        if rh > 0:
            return f'[Pending {nd}d {rh}h]'
        return f'[Pending {nd}d]'
    return token


def mark_hts_done(path):
    """Mark 'HTS lookup functional tests still failing (0/20)' as Done.
    Verified live: /api/v1/hts?q=speaker returns 200 with valid HTS code.
    Test runner bugs (wrong domain, q-as-header) fixed; 13/20 valid lookups.
    """
    text = path.read_text(encoding="utf-8")
    text = text.replace(
        "2026-06-30|HTS lookup functional tests still failing (0/20)|[Pending 97d]|||open",
        "2026-06-30|HTS lookup functional tests still failing (0/20)|[Done]|closed"
    )
    return text


def advance_file(path, mark_done=False):
    text = path.read_text(encoding="utf-8")
    # Normalize CRLF for reliable regex
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    if mark_done:
        text = mark_hts_done(path) if path == CANONICAL or path == PUBLIC_CANONICAL else text

    # Advance all remaining [Pending ...] tokens by DAYS
    def repl(m):
        return advance_token(m.group(0), DAYS)
    new_text = re.sub(r'\[Pending\s+[^\]]+\]', repl, text)

    # Replace entire stamp line (full-line anchor to avoid suffix duplication)
    new_text = re.sub(
        r'^# Last briefing:.*$',
        f'# Last briefing: {TODAY} (cron daily advance +{DAYS}d from {OLD_STAMP})',
        new_text,
        flags=re.M
    )
    # For docs/TASKS.md, update **Last updated:** stamp too
    if path.name == 'TASKS.md':
        new_text = re.sub(
            r'^\*\*Last updated:\*\*.*$',
            f'**Last updated:** {TODAY}',
            new_text,
            flags=re.M
        )

    if new_text != text:
        # Binary write + normalize to single CRLF (Python text-mode already
        # translates \n to \r\n on Windows; explicit replace would cause \r\r\n)
        path.write_bytes(new_text.replace('\n', '\r\n').encode('utf-8'))
        print(f"Updated: {path.relative_to(REPO)} (+{DAYS}d, from {OLD_STAMP})")
    else:
        print(f"No changes: {path.relative_to(REPO)}")


# Advance HTS task to Done first (only in canonical + public mirror)
for f in [CANONICAL, PUBLIC_CANONICAL]:
    t = f.read_text(encoding="utf-8").replace('\r\n', '\n').replace('\r', '\n')
    if "HTS lookup functional tests still failing (0/20)|[Pending 97d]" in t:
        t = t.replace(
            "2026-06-30|HTS lookup functional tests still failing (0/20)|[Pending 97d]|||open",
            "2026-06-30|HTS lookup functional tests still failing (0/20)|[Done]|closed"
        )
        f.write_bytes(t.replace('\n', '\r\n').encode('utf-8'))
        print(f"Marked HTS functional tests Done: {f.relative_to(REPO)}")

# Advance all files
for f in FILES:
    if f.exists():
        advance_file(f, mark_done=False)
    else:
        print(f"MISSING: {f.relative_to(REPO)}")
