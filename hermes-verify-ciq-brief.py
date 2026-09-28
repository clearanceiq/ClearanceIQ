#!/usr/bin/env python3
"""Ad-hoc verifier for ClearanceIQ daily ops brief — 2026-09-24 run.
Checks: required sections, pending-tag coverage from canonical, word count, Done count reconciliation.
Runs from temp path; REPO hardcoded to avoid __file__ parent-count pitfalls on Windows."""
import re, sys, os

REPO = r"C:\Users\Najmi\Documents\Tycoon\site"
BRIEF_PATH = os.path.join(REPO, "docs", "DAILY_OPS_BRIEF.md")
CANON_PATH = os.path.join(REPO, "ops", "daily-tasks.md")

def normalize(text):
    return text.replace('\r\n', '\n').replace('\r', '\n')

def content_words(text):
    stripped = re.sub(r'[|#*>`\-]', ' ', text)
    return len(stripped.split())

def main():
    errors = []

    # Load brief
    if not os.path.exists(BRIEF_PATH):
        errors.append(f"Brief missing: {BRIEF_PATH}")
        print("RESULT: FAIL — " + "\n".join(errors))
        sys.exit(1)
    brief_text = normalize(open(BRIEF_PATH, encoding='utf-8').read())

    # Load canonical
    if not os.path.exists(CANON_PATH):
        errors.append(f"Canonical missing: {CANON_PATH}")
        print("RESULT: FAIL — " + "\n".join(errors))
        sys.exit(1)
    canon_text = normalize(open(CANON_PATH, encoding='utf-8').read())

    # 1. Required sections — exact headings per skill
    required = ["PENDING SUMMARY", "OLDEST PENDING TASKS", "TIME SENSITIVE"]
    for section in required:
        if section not in brief_text:
            errors.append(f"Missing section: {section}")

    # 2. Canonical pending tags → extract from canon data rows only (skip comments)
    canon_tags = set()
    for line in canon_text.split('\n'):
        if line.strip().startswith('#'):
            continue
        m = re.search(r'\[(Pending [^\]]+)\]', line)
        if m:
            canon_tags.add('[' + m.group(1) + ']')

    # 3. Brief row regex — 4-col `| # | Task | Age | Status |`
    # Age column carries `[Pending Xd]` token (with brackets)
    brief_rows = re.findall(r'^\|\s*\d+\s*\|.*?\[(Pending [^\]]+)\].*\|.*$', brief_text, re.M)
    brief_tags = set('[' + t + ']' for t in brief_rows)

    missing = canon_tags - brief_tags
    if missing:
        errors.append(f"Pending tags in canonical but missing from brief: {sorted(missing)}")

    # 4. Word count (content words, not raw split)
    wc = content_words(brief_text)
    if wc > 400:
        errors.append(f"Brief over 400 content-words: {wc}")

    # 5. Done count reconciliation
    # Count [Done] in canonical (skip comment lines starting with #)
    canon_done = 0
    for line in canon_text.split('\n'):
        if line.strip().startswith('#'):
            continue
        if '[Done]' in line:
            canon_done += 1

    # Find "N tasks Done" in brief body
    done_match = re.search(r'(\d+)\s*tasks\s*Done', brief_text)
    if done_match:
        brief_done = int(done_match.group(1))
        if brief_done != canon_done:
            errors.append(f"Done count mismatch: brief says {brief_done}, canonical has {canon_done}")
    else:
        errors.append("Could not find 'N tasks Done' in brief body")

    # 6. No leaked secret literals (real shapes only, skip placeholders)
    secret_patterns = [
        r'sk_live_[a-zA-Z0-9]{24,}',
        r'pk_live_[a-zA-Z0-9]{24,}',
        r'cfat_[a-f0-9]{40,}',
        r'Bearer [a-f0-9]{40,}',
    ]
    for pat in secret_patterns:
        if re.search(pat, brief_text):
            errors.append(f"Possible leaked secret matching: {pat}")

    if errors:
        print("RESULT: FAIL")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print(f"RESULT: PASS (content-words: {wc}, canon_pending_tags: {len(canon_tags)}, brief_rows: {len(brief_rows)}, canon_done: {canon_done})")

if __name__ == '__main__':
    main()
