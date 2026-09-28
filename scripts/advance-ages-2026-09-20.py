#!/usr/bin/env python3
"""Advance ClearanceIQ task ages for 2026-09-20 briefing.
Each file advanced by its own delta since its last stamped briefing date.
Preserves native format; only swaps age tokens + stamp line in-place.
"""
import re
from pathlib import Path

TODAY = "2026-09-20"
REPO = Path(r"C:\Users\Najmi\Documents\Tycoon\site")

def advance_bare_days(token, days):
    m = re.match(r"\[Pending\s+(\d+)d\]", token)
    if m:
        return f"[Pending {int(m.group(1)) + days}d]"
    return token

def advance_full(token, days):
    m = re.match(r"\[Pending\s+(\d+)\s*d\s+(\d+)h\]", token)
    if m:
        d = int(m.group(1)) + days
        h = int(m.group(2))
        if h >= 24:
            d += h // 24
            h = h % 24
        if d == 0 and h == 0:
            return "[Pending 0h]"
        if d > 0 and h > 0:
            return f"[Pending {d}d {h}h]"
        elif d > 0:
            return f"[Pending {d}d]"
        else:
            return f"[Pending {h}h]"
    return token

def advance_malformed(token, days):
    """[Pending Xd 1] without h suffix -> [Pending (X+d)d 1]"""
    m = re.match(r"\[Pending\s+(\d+)d\s+(\d+)\]", token)
    if m:
        d = int(m.group(1)) + days
        h = m.group(2)
        return f"[Pending {d}d {h}]"
    return token

def advance_token(token, days):
    for fn in (advance_full, advance_malformed, advance_bare_days):
        r = fn(token, days)
        if r != token:
            return r
    return token

def advance_file(path, days, prev_date):
    text = path.read_text(encoding="utf-8")
    new_text = re.sub(
        r"\[Pending\s+[^\]]+\]",
        lambda m: advance_token(m.group(0), days),
        text,
    )
    if path.name == "TASKS.md":
        new_text = re.sub(
            r"\*\*Last updated:\*\* \d{4}-\d{2}-\d{2}",
            f"**Last updated:** {TODAY}",
            new_text,
        )
    else:
        new_text = re.sub(
            r"# Last briefing: \d{4}-\d{2}-\d{2}.*",
            f"# Last briefing: {TODAY} (cron daily advance +{days}d from {prev_date})",
            new_text,
        )
    if new_text != text:
        path.write_bytes(new_text.encode("utf-8"))
        print(f"Updated: {path.relative_to(REPO)} (+{days}d)")
    else:
        print(f"No changes: {path.relative_to(REPO)}")

files = [
    (REPO / "ops" / "daily-tasks.md", 1, "2026-09-19"),
    (REPO / "TODO.md", 1, "2026-09-19"),
    (REPO / "public" / "ops" / "daily-tasks.md", 1, "2026-09-19"),
    (REPO / "public" / "TODO.md", 4, "2026-09-16"),
    (REPO / "docs" / "TASKS.md", 9, "2026-09-11"),
]

for p, d, pd in files:
    if p.exists():
        advance_file(p, d, pd)
    else:
        print(f"MISSING: {p}")
