#!/usr/bin/env python3
"""Append validated, de-duped potential-user leads to potential-users.csv.

Usage:
  python append_leads.py "email,company,source,notes" ["email,company,source,notes", ...]

Notes:
- email validated with regex, must look like a real company domain.
- broker/forwarder domains excluded (*-chb, broker, freight, forwarding, customs, 3pl, logistics).
- de-duped against the existing file and within the batch.
- preserves header and existing rows; appends only new lines, CSV-escaped.
"""
import csv
import re
import sys
from datetime import datetime, timezone

PATH = "C:/Users/Najmi/Documents/Tycoon/site/marketing/leads/potential-users.csv"

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Broker / forwarder / 3PL indicator tokens (substring match on domain)
EXCLUDE_TOKENS = [
    "chb", "broker", "freight", "forwarding", "forwarder", "customs",
    "3pl", "logistics", "shipping", "cargo", "courier", "clearing",
    "transit", "shipwire", "fulfilment", "fulfillment", "warehous",
    "import-export", "tradecompliance", "dutiable", "cbp",
]

# Obviously throwaway / personal-mail domains that are NOT company domains
THROWAWAY_OK_PERSONAL = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
                         "icloud.com", "aol.com", "proton.me", "protonmail.com",
                         "gmx.com", "live.com", "msn.com"}


def is_broker(email):
    dom = email.lower().split("@")[-1]
    for tok in EXCLUDE_TOKENS:
        if tok in dom:
            return True
    return False


def load_existing():
    existing = set()
    rows = []
    try:
        with open(PATH, newline="", encoding="utf-8") as f:
            r = csv.reader(f)
            header = next(r, None)
            for row in r:
                if row and row[0].strip():
                    existing.add(row[0].strip().lower())
    except FileNotFoundError:
        pass
    return existing


def main():
    existing = load_existing()
    batch_seen = set()
    added = 0
    rejected = {"invalid": [], "broker": [], "dup": [], "throwaway": []}
    new_rows = []

    for arg in sys.argv[1:]:
        parts = arg.split(",", 3)
        if len(parts) < 4:
            # allow notes empty
            while len(parts) < 4:
                parts.append("")
        email, company, source, notes = [p.strip() for p in parts[:4]]
        email = email.strip().lower()
        if not EMAIL_RE.match(email):
            rejected["invalid"].append(email)
            continue
        if is_broker(email):
            rejected["broker"].append(email)
            continue
        if email in existing or email in batch_seen:
            rejected["dup"].append(email)
            continue
        batch_seen.add(email)
        collected_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        new_rows.append([email, company, source, collected_at, notes])
        added += 1

    if new_rows:
        with open(PATH, "a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerows(new_rows)

    print(f"ADDED: {added}")
    print(f"REJECTED invalid: {len(rejected['invalid'])} -> {rejected['invalid'][:10]}")
    print(f"REJECTED broker: {len(rejected['broker'])} -> {rejected['broker'][:10]}")
    print(f"REJECTED dup: {len(rejected['dup'])} -> {rejected['dup'][:10]}")

    # total count
    with open(PATH, encoding="utf-8") as f:
        total = sum(1 for _ in csv.reader(f)) - 1
    print(f"TOTAL DATA ROWS: {total}")


if __name__ == "__main__":
    main()
