#!/usr/bin/env python3
"""Build the final 100-row lead list from clean_candidates.tsv and append to
the CSV via append_leads.py protocol. We classify each email's persona/source
and write notes. We stop at exactly 100 data rows.

Input: clean_v2.tsv (EMAIL<TAB>DOMAIN<TAB>SOURCE_URL<TAB>HUB)
Output: appends to potential-users.csv (email,company,source,collected_at,notes)
De-dupes against existing file.
"""
import csv, re, subprocess, sys
from datetime import datetime, timezone

CSV_PATH = "C:/Users/Najmi/Documents/Tycoon/site/marketing/leads/potential-users.csv"
CLEAN = "clean_v2.tsv"
TARGET = 100

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
BROKER_TOKENS = ["chb","broker","freight","forwarding","forwarder","customs",
    "3pl","logistics","cargo","courier","clearing","transit","fulfilment",
    "fulfillment","warehous","import-export","tradecompliance","cbp",
    "shipwire","shipping"]

def is_broker(email):
    dom = email.split("@")[-1].lower()
    return any(t in dom for t in BROKER_TOKENS)

# Map a hub URL to a human-readable source + persona note
def classify(hub, dom, email_local):
    h = hub.lower()
    if "shopify.com/blog/shopify-stores" in h or "shopify-stores" in h:
        src = "Shopify 'best stores' listicle"
        note = "E-commerce/DTC brand (private-label importer) named in Shopify store showcase"
    elif "founder-stories" in h:
        src = "Shopify Founder Stories interview"
        note = "DTC brand founder interview (importer of private-label goods)"
    elif "podcasts" in h:
        src = "Shopify Masters podcast index"
        note = "E-commerce brand founder on Shopify Masters (imports private-label products)"
    elif "shopify.com" in h:
        src = "Shopify blog"
        note = "DTC/e-commerce brand featured on Shopify blog"
    elif "omnisend" in h or "wisepops" in h or "printify" in h or "printful" in h \
         or "fastbundle" in h or "genielab" in h or "webinopoly" in h or "ecomm.design" in h \
         or "builtin" in h or "dokan" in h or "websitebuilderexpert" in h or "yotpo" in h \
         or "bigcommerce" in h or "selz" in h:
        src = "E-commerce brand listicle (DTC/Shopify directory)"
        note = "Private-label DTC brand listed in e-commerce store directory"
    elif "helium10" in h or "junglescout" in h or "sellics" in h or "iamstaffed" in h:
        src = "Amazon FBA seller resource/blog"
        note = "Amazon FBA private-label seller community resource"
    elif "aboutamazon" in h:
        src = "Amazon Small Business Spotlight"
        note = "Amazon small-business seller finalist (importer)"
    else:
        src = "E-commerce brand directory"
        note = "DTC/private-label brand contact email from public directory"
    return src, note

def load_existing():
    s = set()
    try:
        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            r = csv.reader(f)
            next(r, None)
            for row in r:
                if row and row[0].strip():
                    s.add(row[0].strip().lower())
    except FileNotFoundError:
        pass
    return s

def main():
    existing = load_existing()
    rows_to_add = []
    seen = set()
    with open(CLEAN, encoding="utf-8") as f:
        header_seen = False
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("EMAIL\t") or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) < 4:
                continue
            em, dom, url, hub = parts[0], parts[1], parts[2], parts[3]
            em = em.strip().lower()
            if not EMAIL_RE.match(em):
                continue
            if is_broker(em):
                continue
            if em in existing or em in seen:
                continue
            seen.add(em)
            src, note = classify(hub, dom, em.split("@")[0])
            company = dom
            rows_to_add.append((em, company, src, note))
            if len(rows_to_add) >= TARGET:
                break

    print(f"# Prepared {len(rows_to_add)} rows for append", file=sys.stderr)
    # write to a temp args file and call append_leads.py
    collected_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    argfile = "to_append.txt"
    with open(argfile, "w", encoding="utf-8") as af:
        for em, company, src, note in rows_to_add:
            af.write(f"{em},{company},{src},{note}\n")

    # call append_leads.py with the lines
    args = [sys.executable, "append_leads.py"]
    with open(argfile, encoding="utf-8") as af:
        for line in af:
            line = line.strip()
            if line:
                args.append(line)
    subprocess.run(args)

if __name__ == "__main__":
    main()
