#!/usr/bin/env python3
"""Collect brand-site emails from curated e-commerce/importer hub pages.

Pipeline:
 1. Fetch a set of "hub" pages (Shopify store listicles, Shopify Masters
    podcast index, founder-story indexes) that link to e-commerce brand sites.
 2. Extract external brand domains (excluding social/shopify/host noise).
 3. For each brand domain, crawl homepage + contact/about for emails.
 4. Filter out broker/logistics/personal, de-dupe, print candidate lines.

Output lines (tab-separated candidate, NOT yet validated for persona):
  email<TAB>company_domain<TAB>broker_flag<TAB>personal_flag<TAB>source_url
"""
import re
import sys
import urllib.request
import urllib.error
from urllib.parse import urljoin, urlparse
from html import unescape
from collections import OrderedDict

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
LINK_RE = re.compile(r'href=["\']([^"\']+)["\']', re.I)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

BROKER_TOKENS = ["chb", "broker", "freight", "forwarding", "forwarder",
                 "customs", "3pl", "logistics", "cargo", "courier",
                 "clearing", "transit", "fulfilment", "fulfillment",
                 "warehous", "import-export", "tradecompliance", "cbp",
                 "shipwire", "shipping"]

THROWAWAY = {"gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com",
             "aol.com","proton.me","protonmail.com","gmx.com","live.com",
             "msn.com","yandex.com","mail.com","zoho.com","qq.com","163.com",
             "126.com","naver.com","hotmail.co.uk"}

BLOCK_HOSTS = ["shopify.com","amazon.com","youtube.com","instagram.com",
               "facebook.com","linkedin.com","twitter.com","x.com","pinterest.com",
               "tiktok.com","reddit.com","apple.com","spotify.com","audible.com",
               "wikipedia.org","google.com","gstatic.com","cloudflare.com",
               "github.com","medium.com","quora.com","trustpilot.com","wikihow.com",
               "shopifycdn.com","cdn.shopify.com","beautiful.ai","canva.com"]

def fetch(url, timeout=12):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            return data.decode("utf-8", "ignore")
    except Exception:
        return None

def brand_domains_from_hub(url):
    html = fetch(url)
    if not html:
        return []
    out = set()
    for m in LINK_RE.finditer(html):
        href = m.group(1)
        if href.lower().startswith(("mailto:", "javascript:", "#", "tel:")):
            continue
        p = urlparse(href)
        host = (p.netloc or "").lower()
        if not host:
            continue
        if host.startswith("www."):
            host = host[4:]
        if any(b in host for b in BLOCK_HOSTS):
            continue
        if host.count(".") < 1:
            continue
        # must look like a real domain (has tld length >=2)
        tld = host.split(".")[-1]
        if len(tld) < 2:
            continue
        out.add(host)
    return out

def crawl_brand(domain, source_label):
    candidates = []
    for path in ["", "/contact", "/contact-us", "/about", "/about-us",
                 "/pages/contact", "/pages/about", "/get-in-touch", "/support"]:
        url = f"https://{domain}{path}"
        html = fetch(url)
        if not html:
            continue
        for em in set(EMAIL_RE.findall(unescape(html))):
            em = em.lower()
            dom = em.split("@")[-1]
            broker = any(t in dom for t in BROKER_TOKENS)
            personal = dom in THROWAWAY
            candidates.append((em, dom, broker, personal, url, source_label))
    return candidates

def main():
    hubs = [
        "https://www.shopify.com/blog/shopify-stores",
        "https://wisepops.com/blog/shopify-stores",
        "https://www.omnisend.com/blog/top-shopify-stores/",
        "https://printify.com/blog/shopify-store-examples/",
        "https://fastbundle.co/blog/best-shopify-stores/",
        "https://www.printful.com/blog/shopify-store-examples",
        "https://www.shopify.com/blog/topics/podcasts",
        "https://www.shopify.com/blog/topics/podcasts?page=2",
        "https://www.shopify.com/blog/topics/podcasts?page=3",
        "https://www.shopify.com/blog/topics/founder-stories",
        "https://www.shopify.com/blog/topics/founder-stories?page=2",
        "https://www.shopify.com/blog/topics/founder-stories?page=3",
    ]
    all_domains = OrderedDict()
    for h in hubs:
        try:
            doms = brand_domains_from_hub(h)
        except Exception as e:
            print(f"# hub err {h}: {e}", file=sys.stderr)
            continue
        for d in doms:
            all_domains.setdefault(d, h)
        print(f"# hub {h}: {len(doms)} domains (total {len(all_domains)})", file=sys.stderr)

    seen_email = set()
    rows = []
    for dom, hub in all_domains.items():
        try:
            cands = crawl_brand(dom, hub)
        except Exception as e:
            continue
        for em, d, broker, personal, url, src in cands:
            if em in seen_email:
                continue
            seen_email.add(em)
            rows.append((em, d, int(broker), int(personal), url, src))
        if len(rows) >= 400:
            break

    print("# EMAIL\tDOMAIN\tBROKER\tPERSONAL\tSOURCE")
    for r in rows:
        print("\t".join(str(x) for x in r))

if __name__ == "__main__":
    main()
