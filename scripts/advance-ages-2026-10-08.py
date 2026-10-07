#!/usr/bin/env python3
"""Advance ClearanceIQ task ages for 2026-10-08 briefing.

Each file advanced by 2 days (Oct 6 -> Oct 8; Oct 7 cron did not fire).
Preserves native format; only swaps [Pending ...] tokens + stamp line in-place.
Binary write to avoid CRLF doubling on Windows.

Live reconciliation (Oct 8): homepage 200, HTS API 200, chat OPTIONS 204.
Admin paths still 302 (not 404). cpsc-certificate.html still 404.
No new completions since Oct 6 -- only age advance.
"""
import re
from pathlib import Path

REPO = Path(r"C:\Users\Najmi\Documents\Tycoon\site")
TODAY = "2026-10-08"
OLD_STAMP = "2026-10-06"
DAYS = 2

# All six task artifacts (canonical + public mirror, TODO + public TODO, TASKS + public TASKS)
CANONICAL = REPO / "ops" / "daily-tasks.md"
PUBLIC_CANONICAL = REPO / "public" / "ops" / "daily-tasks.md"
TODO = REPO / "TODO.md"
PUBLIC_TODO = REPO / "public" / "TODO.md"
TASKS = REPO / "docs" / "TASKS.md"
PUBLIC_TASKS = REPO / "public" / "docs" / "TASKS.md"

FILES = [CANONICAL, PUBLIC_CANONICAL, TODO, PUBLIC_TODO, TASKS, PUBLIC_TASKS]


def advance_token(token, days):
    """Advance a single [Pending ...] token by N days."""
    # [Pending Xd Xh] full format (TODO.md)
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
    # [Pending Xd] bare-day (canonical, TASKS.md)
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


def advance_file(path):
    text = path.read_text(encoding="utf-8")
    # Normalize CRLF for reliable regex
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    orig = text

    # Advance all remaining [Pending ...] tokens by DAYS (Done rows have no Pending token -> untouched)
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
    # For docs/TASKS.md, also update **Last updated:** stamp if present
    if path.name == 'TASKS.md':
        new_text = re.sub(
            r'^\*\*Last updated:\*\*.*$',
            f'**Last updated:** {TODAY}',
            new_text,
            flags=re.M
        )

    if new_text != orig:
        # Binary write + normalize to single CRLF (Python text-mode already
        # translates \n to \r\n on Windows; explicit replace would cause \r\r\n)
        path.write_bytes(new_text.replace('\n', '\r\n').encode('utf-8'))
        print(f"Updated: {path.relative_to(REPO)} (+{DAYS}d, from {OLD_STAMP})")
    else:
        print(f"No changes: {path.relative_to(REPO)}")


for f in FILES:
    if f.exists():
        advance_file(f)
    else:
        print(f"MISSING: {f.relative_to(REPO)}")
