#!/usr/bin/env python3
"""Filter bogus 'emails' (image filenames like name_500x@2x.png) from the
candidates TSV, drop broker/logistics, drop pure-personal, dedupe, and emit
clean candidate lines: email<TAB>company_domain<TAB>source."""
import re
from collections import OrderedDict

IMG_EXT = {"jpg","jpeg","png","gif","webp","svg","bmp","ico","pdf","css","js"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

BROKER_TOKENS = ["chb","broker","freight","forwarding","forwarder","customs",
                 "3pl","logistics","cargo","courier","clearing","transit",
                 "fulfilment","fulfillment","warehous","import-export",
                 "tradecompliance","cbp","shipwire","shipping"]
THROWAWAY = {"gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com",
             "aol.com","proton.me","protonmail.com","gmx.com","live.com",
             "msn.com","yandex.com","mail.com","zoho.com","qq.com","163.com",
             "126.com","naver.com","hotmail.co.uk"}

def is_real(e):
    if not EMAIL_RE.match(e):
        return False
    local, dom = e.split("@")
    tld = dom.split(".")[-1].lower()
    if tld in IMG_EXT:
        return False
    if not dom[0].isalpha():   # rejects "2x.png" style
        return False
    if not local[0].isalpha():  # real local parts start with a letter
        return False
    # reject dimension patterns like abc_500x
    if re.search(r"_\d+x$", local) or re.search(r"\dx$", local):
        return False
    return True

def main():
    rows = []
    seen = set()
    kept = 0
    rejected_img = 0
    rejected_broker = 0
    rejected_personal = 0
    with open("candidates_brands.tsv", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) < 6:
                continue
            em, dom, broker, personal, url, src = parts[:6]
            if not is_real(em):
                rejected_img += 1
                continue
            if any(t in dom for t in BROKER_TOKENS):
                rejected_broker += 1
                continue
            if dom in THROWAWAY:
                rejected_personal += 1
                continue
            if em in seen:
                continue
            seen.add(em)
            rows.append((em, dom, src))
            kept += 1
    print(f"# kept={kept} rejected_img={rejected_img} broker={rejected_broker} personal={rejected_personal}",
          file=__import__("sys").stderr)
    print("# EMAIL\tDOMAIN\tSOURCE")
    for r in rows:
        print("\t".join(r))

if __name__ == "__main__":
    main()
