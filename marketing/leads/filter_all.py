#!/usr/bin/env python3
"""Filter candidate TSVs into clean, dedupe'd brand-importer emails.

Usage: python filter_all.py [candidates_v2.tsv ...]
Writes clean_candidates.tsv with header removed -> rows only:
  email<TAB>company_domain<TAB>source_url<TAB>hub
Also prints summary stats to stderr.
"""
import re, sys
from collections import OrderedDict

IMG_EXT = {"jpg","jpeg","png","gif","webp","svg","bmp","ico","pdf","css","js","mp4","mov"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
BROKER_TOKENS = ["chb","broker","freight","forwarding","forwarder","customs",
    "3pl","logistics","cargo","courier","clearing","transit","fulfilment",
    "fulfillment","warehous","import-export","tradecompliance","cbp",
    "shipwire","shipping","freightforward","clearinghouse"]
THROWAWAY = {"gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com",
    "aol.com","proton.me","protonmail.com","gmx.com","live.com","msn.com",
    "yandex.com","mail.com","zoho.com","qq.com","163.com","126.com","naver.com",
    "hotmail.co.uk","email.com","example.com","xyz.com","domain.com","test.com",
    "your-email.com"}
# Roles we DON'T want (site-noreply, privacy, etc. are fine but low value; keep)
SKIP_LOCAL = {"example","test","user","domain","your-email","abc","noreply-test"}

def clean_email(e):
    # strip HTML-escaped/raw angle-bracket + JSON-escape artifacts from scraping
    e = e.replace("\\u003e","").replace("\\u003c","").replace("u003e","").replace("u003c","")
    e = e.replace("&gt;","").replace("&lt;","").replace(">","")
    e = e.strip().strip("<>").strip()
    return e

def is_real(e):
    if not EMAIL_RE.match(e):
        return False
    local, dom = e.split("@")
    tld = dom.split(".")[-1].lower()
    if tld in IMG_EXT:
        return False
    if not dom[0].isalpha():
        return False
    if not local[0].isalpha():
        return False
    if re.search(r"_\d+x$", local) or re.search(r"\dx$", local):
        return False
    if re.search(r"\d{3,}$", local) and len(local) > 6:  # date-like: 2026...
        return False
    return True

def main():
    files = sys.argv[1:]
    stats = {"kept":0,"img":0,"broker":0,"personal":0,"invalid":0,"dup":0,"skip":0}
    seen = set()
    rows = []
    for fn in files:
        with open(fn, encoding="utf-8") as f:
            for line in f:
                line = line.rstrip("\n")
                if line.startswith("#") or not line.strip():
                    continue
                parts = line.split("\t")
                if len(parts) < 4:
                    continue
                em, dom, url, hub = parts[0], parts[1], parts[2], parts[3]
                em = clean_email(em)
                if not is_real(em):
                    stats["img"] += 1; continue
                if dom in THROWAWAY or em.split("@")[0].lower() in SKIP_LOCAL:
                    stats["personal"] += 1; continue
                if any(t in dom for t in BROKER_TOKENS):
                    stats["broker"] += 1; continue
                if em in seen:
                    stats["dup"] += 1; continue
                seen.add(em)
                rows.append((em, dom, url, hub))
                stats["kept"] += 1
    print("# EMAIL\tDOMAIN\tSOURCE_URL\tHUB", file=sys.stderr)
    print(f"# STATS {stats}", file=sys.stderr)
    print("EMAIL\tDOMAIN\tSOURCE_URL\tHUB")
    for r in rows:
        print("\t".join(r))

if __name__ == "__main__":
    main()
