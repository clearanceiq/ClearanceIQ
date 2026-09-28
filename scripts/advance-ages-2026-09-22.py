#!/usr/bin/env python3
"""ClearanceIQ multi-artifact age advance + format fix — 2026-09-22 run.

Per-file deltas are derived from each artifact's own last-briefing stamp so
siblings that drifted to different "last briefing" dates do not get the same
delta and double-advance or reset.

Fixes applied before advancing:
  - TODO.md / public/TODO.md: prepend missing "| " to rows that start with
    whitespace+digit+| but no leading pipe.
  - public/TODO.md row 4: normalize malformed [Pending 70d 1] -> [Pending 70d 1h].
"""
import re
from pathlib import Path

TODAY = "2026-09-22"
REPO  = Path(r"C:\Users\Najmi\Documents\Tycoon\site")

# (relative_path, prev_briefing_date, delta_days)
FILES = [
    ("ops/daily-tasks.md",       "2026-09-20", 2),
    ("TODO.md",                  "2026-09-20", 2),
    ("public/ops/daily-tasks.md","2026-09-20", 2),
    ("public/TODO.md",           "2026-09-20", 2),   # stamp from 09-20; catch up same as root
    ("docs/TASKS.md",            "2026-09-11", 11),  # independent bullet-style artifact
]


# ── helpers ──────────────────────────────────────────────────────────────────

def advance_token(token, days):
    m = re.match(r"\[Pending\s+(\d+)\s*d\s+(\d+)h\]", token)
    if m:
        d, h = int(m.group(1)) + days, int(m.group(2))
        if h >= 24:
            d += h // 24; h %= 24
        if d == 0 and h == 0:  return "[Pending 0h]"
        if d > 0 and h > 0:    return f"[Pending {d}d {h}h]"
        if d > 0:              return f"[Pending {d}d]"
        return f"[Pending {h}h]"
    m = re.match(r"\[Pending\s+(\d+)d\]", token)
    if m:
        return f"[Pending {int(m.group(1)) + days}d]"
    # malformed [Pending Xd 1] without 'h' suffix
    m = re.match(r"\[Pending\s+(\d+)d\s+(\d+)\]", token)
    if m:
        return f"[Pending {int(m.group(1)) + days}d {m.group(2)}h]"
    return token


def fix_missing_leading_pipe(text):
    """Prepend '| ' to TODO rows that start with optional-whitespace + num + '|'."""
    lines = text.split("\n")
    out = []
    for line in lines:
        if re.match(r"^\s+\d+\s*\|", line) and not line.lstrip().startswith("|"):
            line = "| " + line.lstrip()
        out.append(line)
    return "\n".join(out)


def fix_malformed_age(text):
    """Normalize [Pending Xd 1] (missing 'h') → [Pending Xd 1h]."""
    return re.sub(r"\[Pending\s+(\d+)d\s+(\d+)\]", r"[Pending \1d \2h]", text)


def advance_file(path, prev_date, days):
    p = REPO / path
    if not p.exists():
        print(f"MISSING: {path}"); return

    text = p.read_text(encoding="utf-8")

    # 1. Format fixes (TODO.md-family only)
    if path.endswith("TODO.md"):
        text = fix_missing_leading_pipe(text)
        text = fix_malformed_age(text)

    # 2. Normalize CRLF → LF for reliable regex
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # 3. Advance every [Pending …] token in-place
    text = re.sub(r"\[Pending\s+[^\]]+\]", lambda m: advance_token(m.group(0), days), text)

    # 4. Update stamp line (full-line anchor to avoid suffix duplication)
    if path.endswith("TASKS.md"):
        text = re.sub(
            r"^\*\*Last updated:\*\*.*$",
            f"**Last updated:** {TODAY}",
            text, flags=re.M)
    else:
        text = re.sub(
            r"^#\s*Last briefing:.*$",
            f"# Last briefing: {TODAY} (cron daily advance +{days}d from {prev_date})",
            text, flags=re.M)

    # 5. Write back (binary mode → no CRLF doubling on Windows)
    new_bytes = text.replace("\n", "\r\n").encode("utf-8")
    p.write_bytes(new_bytes)
    print(f"Updated: {path}  (+{days}d  from {prev_date})")


# ── run ──────────────────────────────────────────────────────────────────────
for rel, prev, days in FILES:
    advance_file(rel, prev, days)

print("All artifacts advanced.")
