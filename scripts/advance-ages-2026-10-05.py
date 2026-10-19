#!/usr/bin/env python3
"""Advance ClearanceIQ task ages for 2026-10-05 briefing.
Each file advanced by its own delta since its last stamped briefing date.
Preserves native format; only swaps age tokens + stamp line in-place.
Binary write to avoid CRLF doubling on Windows.
"""
import re
from pathlib import Path

REPO = Path(r"C:\Users\Najmi\Documents\Tycoon\site")
TODAY = "2026-10-05"

FILES = {
    REPO / "ops" / "daily-tasks.md": ("2026-10-01", 4),
    REPO / "public" / "ops" / "daily-tasks.md": ("2026-10-01", 4),
    REPO / "TODO.md": ("2026-10-01", 4),
    REPO / "public" / "TODO.md": ("2026-10-01", 4),
    REPO / "docs" / "TASKS.md": ("2026-09-28", 7),
    REPO / "public" / "docs" / "TASKS.md": ("2026-09-28", 7),
}

def advance_token(token, days):
    # [Pending Xd Xh] full format (TODO.md style)
    m = re.match(r'\[Pending\s+(\d+)\s*d\s+(\d+)h\]', token)
    if m:
        d = int(m.group(1)) + days
        h = int(m.group(2))
        if h >= 24:
            d += h // 24
            h = h % 24
        if d == 0 and h == 0:
            return '[Pending 0h]'
        if d > 0 and h > 0:
            return f'[Pending {d}d {h}h]'
        elif d > 0:
            return f'[Pending {d}d]'
        else:
            return f'[Pending {h}h]'
    # [Pending Xd] bare-day (canonical ops style)
    m = re.match(r'\[Pending\s+(\d+)d\]', token)
    if m:
        return f'[Pending {int(m.group(1)) + days}d]'
    # [Pending Xh] sub-day
    m = re.match(r'\[Pending\s+(\d+)h\]', token)
    if m:
        new_hours = int(m.group(1)) + days * 24
        if new_hours >= 24:
            nd = new_hours // 24
            rh = new_hours % 24
            if rh > 0:
                return f'[Pending {nd}d {rh}h]'
            return f'[Pending {nd}d]'
        return f'[Pending {new_hours}h]'
    return token

def advance_file(path, old_stamp_date, days):
    text = path.read_text(encoding="utf-8")
    # Normalize CRLF for reliable regex
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    def repl(m):
        return advance_token(m.group(0), days)

    new_text = re.sub(r'\[Pending\s+[^\]]+\]', repl, text)

    # Replace entire stamp line
    new_text = re.sub(
        r'^# Last briefing:.*$',
        f'# Last briefing: {TODAY} (cron daily advance +{days}d from {old_stamp_date})',
        new_text,
        flags=re.M
    )
    # For docs/TASKS.md, update **Last updated:** stamp
    if 'TASKS.md' in path.name:
        new_text = re.sub(
            r'^\*\*Last updated:\*\*.*$',
            f'**Last updated:** {TODAY}',
            new_text,
            flags=re.M
        )

    if new_text != text:
        # Binary write + normalize to single CRLF
        path.write_bytes(new_text.replace('\n', '\r\n').encode('utf-8'))
        print(f"Updated: {path.relative_to(REPO)} (+{days}d)")
    else:
        print(f"No changes: {path.relative_to(REPO)}")

for path, (stamp_date, days) in FILES.items():
    if path.exists():
        advance_file(path, stamp_date, days)
    else:
        print(f"MISSING: {path.relative_to(REPO)}")
