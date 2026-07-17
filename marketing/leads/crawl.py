#!/usr/bin/env python3
"""Harvest candidate emails from a list of URLs (and optionally same-domain
contact/about pages). Prints CSV-ish candidate lines for review.

Usage:
  python crawl.py url1 url2 url3 ...
or
  python crawl.py --file urls.txt
"""
import re
import sys
import urllib.request
import urllib.error
from urllib.parse import urljoin, urlparse
from html import unescape

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
LINK_RE = re.compile(r'href=["\']([^"\']+)["\']', re.I)

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

BROKER_TOKENS = ["chb", "broker", "freight", "forwarding", "forwarder",
                 "customs", "3pl", "logistics", "cargo", "courier",
                 "clearing", "transit", "fulfilment", "fulfillment",
                 "warehous", "import-export", "tradecompliance", "cbp",
                 "shipping", "shipwire"]

THROWAWAY = {"gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com",
             "aol.com","proton.me","protonmail.com","gmx.com","live.com",
             "msn.com","yandex.com","mail.com","zoho.com","qq.com","163.com"}

def fetch(url, timeout=12):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            ct = r.headers.get("Content-Type", "")
            if "html" in ct or "text" in ct:
                try:
                    return data.decode("utf-8", "ignore")
                except Exception:
                    return data.decode("latin-1", "ignore")
            return data.decode("utf-8", "ignore")
    except Exception as e:
        return None

def get_company_from_domain(email):
    dom = email.split("@")[-1]
    base = dom.split(".")[0]
    return base

def contacts_in_html(html, source_url):
    found = []
    if not html:
        return found
    html2 = unescape(html)
    for m in EMAIL_RE.finditer(html2):
        em = m.group(0).lower()
        # skip images, mailto: duplicates handled by set
        dom = em.split("@")[-1]
        broker = any(t in dom for t in BROKER_TOKENS)
        personal = dom in THROWAWAY
        found.append((em, dom, broker, personal))
    return found

def crawl_seed(url, follow=True, depth=1):
    results = {}  # email -> dict
    seen_urls = set()
    def recurse(u, d):
        if u in seen_urls or d < 0:
            return
        seen_urls.add(u)
        html = fetch(u)
        if not html:
            return
        for em, dom, broker, personal in contacts_in_html(html, u):
            if em not in results:
                results[em] = {"domain": dom, "broker": broker,
                               "personal": personal, "source": u}
        if follow and d > 0:
            base = urlparse(u)
            for lm in LINK_RE.finditer(html):
                href = lm.group(1)
                if href.lower().startswith("mailto:"):
                    continue
                absurl = urljoin(u, href)
                p = urlparse(absurl)
                if p.netloc != base.netloc:
                    continue
                low = absurl.lower()
                if any(k in low for k in ["/contact", "/about", "/about-us",
                                          "/get-in-touch", "/support", "/team"]):
                    recurse(absurl, d-1)
    recurse(url, depth)
    return results

def main():
    urls = []
    if "--file" in sys.argv:
        idx = sys.argv.index("--file")
        with open(sys.argv[idx+1]) as f:
            urls = [l.strip() for l in f if l.strip()]
    else:
        urls = [a for a in sys.argv[1:] if a.startswith("http")]
    allres = {}
    for u in urls:
        try:
            res = crawl_seed(u, follow=True, depth=1)
        except Exception as e:
            print(f"# ERR {u}: {e}", file=sys.stderr)
            continue
        for em, info in res.items():
            allres.setdefault(em, info)
    # print candidates
    print("# email,domain,broker,personal,source")
    for em, info in sorted(allres.items()):
        print(f"{em},{info['domain']},{int(info['broker'])},{int(info['personal'])},{info['source']}")

if __name__ == "__main__":
    main()
