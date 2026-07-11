#!/usr/bin/env python
"""
Parse the official USITC Harmonized Tariff Schedule PDF (2026 Rev 11) into a
compact JSON map of 8-digit HTS code -> General (Column 1) duty rate.

The PDF is a fixed-width schedule. Each tariff line looks like:

  0101.21.00   Purebred breeding animals....... .................. Free1/
  0101.90.40 00 Other......................... No............. 4.5%1/   Free (A+, AU, ...)

Columns (left to right): Heading/Subheading | Stat Suf | Description |
Unit of Qty | Rates of Duty 1 General | 1 Special | 2.

We want the GENERAL (Column 1) rate = the FIRST rate token on the line,
before the dot-filler runs that separate it from the Special column.

Run:
  python scripts/parse-hts.py <path-to-fulltext.txt> <out.json>
or rely on defaults:
  python scripts/parse-hts.py
"""
import re, json, sys, os

DEFAULT_TXT = r"C:\Users\Najmi\hts_utf8.txt"
DEFAULT_OUT = r"C:\Users\Najmi\Documents\Tycoon\site\public\data\hts-data.json"

# Matches a rate token: Free, a percent, or a per-unit charge (cents/kg, etc.)
RATE_RE = re.compile(
    r"Free"                                   # free (incl. Free1/ footnotes)
    r"|\d+\.?\d*\s*%"                         # 4.5%  16.6%
    r"|\d+\.?\d*\s*¢\s*(?:/|per)?\s*(?:kg|each|m2|L|liter|g)?"  # 2¢/kg
)
DOTRUN = re.compile(r"\.{3,}")

def first_rate(text):
    """Return the first (General) rate token found in `text`."""
    for seg in DOTRUN.split(text):
        seg = seg.strip()
        if not seg:
            continue
        m = RATE_RE.search(seg)
        if m:
            g = re.sub(r"\s*\d+/\s*", " ", m.group(0))  # drop footnote refs e.g. 1/ 2/
            return re.sub(r"\s+", " ", g).strip()
    return ""

HEAD_RE  = re.compile(r"^\s*(\d{4})\b(?!\.)\s+\S")
SIX_RE   = re.compile(r"^\s*(\d{4}\.\d{2})\b(?!\.)\s")
EIGHT_RE = re.compile(r"^\s*(\d{4}\.\d{2}\.\d{2})\b")

def code_at(l):
    for rx in (EIGHT_RE, SIX_RE, HEAD_RE):
        m = rx.match(l)
        if m:
            return m.group(1)
    return None

def is_code_line(l):
    return code_at(l) is not None

def is_daughter_line(nl):
    """True if `nl` is a sub-item line like '  20   Females...' that carries its
    OWN rate we must NOT inherit. Starts with spaces then a digit."""
    s = nl.lstrip()
    return bool(s) and s[0].isdigit()

def main():
    txt = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TXT
    out = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    lines = open(txt, encoding="utf-8", errors="replace").read().splitlines()

    # Locate the true schedule header: a 'General' line near a 'Special' line,
    # followed within 200 lines by a 010x code line.
    hdr = None
    for i, l in enumerate(lines):
        if "General" in l and i < 50480:
            near = " ".join(lines[max(0, i - 2):i + 3])
            if "Special" in near and any(
                lines[j].startswith("010") for j in range(i, min(i + 200, len(lines)))
            ):
                hdr = i
                break
    assert hdr is not None, "schedule header not found"

    data = {}
    rate4 = ""
    rate6 = ""
    # The main schedule runs from `hdr` up to the "Chapter 99" cross-reference
    # block. Beyond that are tables that list bare codes with no rate and would
    # corrupt inherited values, so we stop there.
    N = next((j for j in range(hdr, len(lines)) if lines[j].strip().startswith("Chapter 99")), len(lines))
    i = hdr
    while i < N:
        l = lines[i]
        code = code_at(l)
        if not code:
            i += 1
            continue
        rate = first_rate(l)
        if not rate:
            # Look ahead only at wrapped DESCRIPTION continuation lines
            # (indented, and NOT a daughter sub-item that starts with a digit).
            j = i + 1
            while j < min(i + 7, N):
                nl = lines[j]
                if nl.strip() == "":
                    j += 1
                    continue
                if is_code_line(nl) or is_daughter_line(nl):
                    break
                if nl[:1] == " ":
                    r = first_rate(nl)
                    if r:
                        rate = r
                        break
                j += 1
        if re.match(r"^\d{4}$", code):
            rate4 = rate or rate4
        elif re.match(r"^\d{4}\.\d{2}$", code):
            rate6 = rate or rate6
        else:  # 8-digit subheading
            if code not in data:
                data[code] = rate or rate6 or rate4
        i += 1

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))
    free = sum(1 for v in data.values() if v.lower().startswith("free"))
    pct  = sum(1 for v in data.values() if "%" in v)
    empty = sum(1 for v in data.values() if not v)
    print(f"wrote {out} ({os.path.getsize(out)} bytes)")
    print(f"codes={len(data)} Free={free} pct={pct} empty={empty}")

if __name__ == "__main__":
    main()
