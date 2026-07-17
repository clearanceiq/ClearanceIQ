#!/usr/bin/env python3
"""Seed a name-based crawl for known Amazon small-business finalist brands.
For each brand name, fetch its likely website guess and a DuckDuckGo-ish
search is not available offline; instead we try common domain patterns and
the brand's known site. We'll feed known brand domains directly.

Brands (Amazon Small Business Spotlight finalists / FBA importers):
Ayoba-Yo, Baking Steel, Damhorst Toys, EcoBark, nutpods, Ravenox, 1818 Farms,
EazyHold, Nerdbugs, OBIA Naturals, Soul Insole, Ultimation, Bedtime Bulb,
Habit Nest, Joe Chocolate Co., plus other known Amazon FBA importer brands.
"""
KNOWN = [
    "ayobayo.com","bakingsteel.com","damhorsttoys.com","ecobark.com","nutpods.com",
    "ravenox.com","1818farms.com","eazyhold.com","nerdbugs.com","obianaturals.com",
    "soulinsole.com","ultimationinc.com","bedtimebulb.com","habitnest.com",
    "joechocolateco.com",
    # additional Amazon FBA / private-label importer brands commonly cited
    "fidgetland.com","crazyaroma.com","buzzpatch.com","sienna naturals","",
    "thecoldestwater.com","ridge.com","casetify.com","brooklinen.com","bombas.com",
    "tuftandneedle.com","casper.com","warbyparker.com","dollarshaveclub.com",
    "everlane.com","allbirds.com","bamboearth.com","simplemodern.com","yetibrands.com",
    "hydroflask.com","owalalife.com","stanley1913.com","spirithoods.com",
    "thegrommet.com","uncommongoods.com","manitobah.ca","velasca.com","sokoglam.com",
    "madeincookware.com","cocofloss.com","unitedbyblue.com","lunchskins.com",
    "suta.in","terrebleu.ca","flourist.com","thenimetyou.com","yeungmancooking.com",
]

import re, sys
from urllib.parse import urlparse
from html import unescape
import urllib.request

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
LINK_RE = re.compile(r'href=["\']([^"\']+)["\']', re.I)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
BLOCK = ["shopify.com","amazon.com","facebook.com","instagram.com","linkedin.com",
         "youtube.com","pinterest.com","tiktok.com","twitter.com","x.com"]

def fetch(url, timeout=7):
    host = urlparse(url).netloc.lower()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8","ignore")
    except Exception:
        return None

def crawl(domain):
    out = []
    seen = set()
    for path in ["","/contact","/contact-us","/about","/about-us","/pages/contact",
                 "/pages/about","/support","/help","/get-in-touch"]:
        html = fetch(f"https://{domain}{path}")
        if not html: continue
        for em in set(EMAIL_RE.findall(unescape(html))):
            em = em.lower()
            if em in seen: continue
            seen.add(em)
            out.append((em, em.split("@")[-1], f"https://{domain}{path}", domain))
    return out

if __name__ == "__main__":
    rows = []
    seen_email = set()
    for d in KNOWN:
        d = d.strip()
        if not d or "." not in d: continue
        for em, dom, url, src in crawl(d):
            if em in seen_email: continue
            seen_email.add(em)
            rows.append((em, dom, url, src))
    print("# EMAIL\tDOMAIN\tSOURCE_URL\tHUB")
    for r in rows:
        print("\t".join(r))
    print(f"# KNOWN-SEED EMAILS={len(rows)}", file=sys.stderr)
