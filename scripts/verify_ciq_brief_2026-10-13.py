#!/usr/bin/env python3
"""Ad-hoc verifier for the Oct-13 ClearanceIQ ops daily brief.

Checks (per ops-daily-brief skill rules):
 1. Brief task-table rows (4-col | # | Task | Age | Status |) parse with [Pending ...] in Age.
 2. All canonical pending tags appear in the brief (canonical-only; 8 unique tags / 17 rows).
 3. Required section headings present (exact).
 4. Done-count in brief body matches actual [Done] count in canonical (skip comment lines).
 5. Content word count < 400 (markdown punctuation stripped, not raw split).
 6. No stray [Pending token outside table rows in brief (orphan check).
 7. No leaked secret literals (scoped to real shapes).
"""
import os
import re
import sys

REPO = r"C:\Users\Najmi\Documents\Tycoon\site"
CANONICAL = os.path.join(REPO, "ops", "daily-tasks.md")
BRIEF = os.path.join(REPO, "docs", "DAILY_OPS_BRIEF.md")


def read_norm(path):
    with open(path, encoding="utf-8") as f:
        return f.read().replace("\r\n", "\n").replace("\r", "\n")


fails = []
warns = []


def check(cond, msg):
    if not cond:
        fails.append(msg)
    return cond


# --- Load ---
try:
    canon = read_norm(CANONICAL)
except FileNotFoundError:
    print(f"FATAL: {CANONICAL} not found")
    sys.exit(2)
try:
    brief = read_norm(BRIEF)
except FileNotFoundError:
    print(f"FATAL: {BRIEF} not found")
    sys.exit(2)

# --- 1. Canonical pending tags (data rows only; skip # comment / stamp lines) ---
canon_rows = [l for l in canon.split("\n") if re.match(r'^\d{4}-\d{2}-\d{2}\|', l)]
canon_done_rows = [l for l in canon_rows if "[Done]" in l]
canon_pending_rows = [l for l in canon_rows if "Pending" in l and "[Done]" not in l]

canon_tags = []
for l in canon_pending_rows:
    m = re.search(r'\[Pending[^\]]*\]', l)
    if m:
        canon_tags.append(m.group(0))
canon_unique = sorted(set(t[1:-1] for t in canon_tags))  # strip outer [] -> "Pending 1d"

print(f"Canonical: {len(canon_rows)} rows, {len(canon_pending_rows)} pending, {len(canon_done_rows)} done")
print(f"Canonical unique pending tags ({len(canon_unique)}): {canon_unique}")

# --- 2. Brief task-table rows ---
# Format: | # | Task | Age | Status |  with [Pending ...] in Age
brief_row_re = re.compile(r'^\|?\s*\d+\s*\|.*?\[Pending ([^\]]+)\].*\|.*\|')
brief_all_lines = brief.split("\n")
table_rows = [l for l in brief_all_lines if brief_row_re.match(l)]
print(f"Brief table rows matched: {len(table_rows)}")

# Extract tags from table rows (inside brackets)
brief_table_tags = []
for l in table_rows:
    m = re.search(r'\[Pending ([^\]]+)\]', l)
    if m:
        brief_table_tags.append("Pending " + m.group(1))
brief_unique_table = sorted(set(brief_table_tags))
print(f"Brief unique table tags: {brief_unique_table}")

check(len(table_rows) == len(canon_pending_rows),
      f"Row count mismatch: brief table {len(table_rows)} vs canonical pending {len(canon_pending_rows)}")
check(set(brief_unique_table) >= set(canon_unique),
      f"Missing canonical tags in brief: {set(canon_unique) - set(brief_unique_table)}")

# --- 3. Required sections (exact headings) ---
for sec in ["PENDING SUMMARY", "OLDEST PENDING TASKS", "TIME SENSITIVE"]:
    check(sec in brief, f"Missing required section: {sec}")

# --- 4. Done-count reconciliation ---
brief_done_match = re.search(r'(\d+)\s+tasks?\s+Done', brief)
brief_done_count = int(brief_done_match.group(1)) if brief_done_match else -1
canon_done_count = len(canon_done_rows)
print(f"Brief Done count: {brief_done_count}, canonical Done count: {canon_done_count}")
check(brief_done_count == canon_done_count,
      f"Done-count mismatch: brief {brief_done_count} vs canonical {canon_done_count}")

# --- 5. Word count: strip markdown punctuation, count \S+ ---
content = re.sub(r'[|#*>`\-]', ' ', brief)       # strip markdown punctuation (skill: '|#*>`\-')
content = re.sub(r'\[([^\]]*)\]', r'\1', content)  # drop brackets but keep inner
words = [w for w in content.split() if w]
print(f"Content word count (markdown-stripped): {len(words)}")
check(len(words) < 400, f"Over 400 content words: {len(words)}")

# --- 6. Orphan-token check (no [Pending tag outside table rows) ---
# A token is orphan if its line is NOT a table row AND NOT a format-comment line.
table_row_set = set(table_rows)
orphan_lines = []
for l in brief_all_lines:
    if "[Pending" in l and l not in table_row_set:
        # allowed: OLDEST / TIME SENSITIVE bullet lines (also carry age tokens) -> not orphans
        if re.match(r'^\-?\s*\d*\.?\s*\[Pending', l) or "[Pending" in l and ("OLDEST" in brief.split("\n")[max(0, brief_all_lines.index(l)-3):brief_all_lines.index(l)+1][0] if False else "") :
            continue
        # Simpler: bullets in OLDEST/TIME SENSITIVE sections are legitimate; flag only stray inline tokens
        orphan_lines.append(l)
# Re-scan properly: collect lines with [Pending that are NOT table rows and NOT bullets
stray = []
for l in brief_all_lines:
    if "[Pending" in l and not brief_row_re.match(l):
        # bullet lines (start with - or N.) are expected in OLDEST/TIME SENSITIVE
        if re.match(r'^(-|\d+\.)\s*\[Pending', l):
            continue
        stray.append(l)
check(len(stray) == 0, f"Stray [Pending tokens outside table/bullets: {stray}")

# --- 7. No leaked secret literals (scoped to real shapes) ---
secret_patterns = [
    (r'sk-[A-Za-z0-9]{20,}', "sk- live secret"),
    (r'pk_live_[A-Za-z0-9]{8,}', "pk_live_ secret"),
    (r'cfat_[A-Za-z0-9_\-]{8,}', "cfat_ token"),
    (r'Bearer\s+[A-Za-z0-9\-._~+/]{20,}', "Bearer token"),
]
leaked = []
for pat, label in secret_patterns:
    m = re.search(pat, brief)
    if m:
        leaked.append((label, m.group(0)))
check(len(leaked) == 0, f"Leaked secret literals: {leaked}")

# --- Report ---
print("\n=== VERIFICATION RESULT ===")
if fails:
    for f in fails:
        print(f"  FAIL: {f}")
    print("RESULT: FAIL")
    sys.exit(1)
else:
    print("  All checks passed.")
    print("RESULT: PASS")
    sys.exit(0)
