#!/usr/bin/env python3
"""Parallel brand-email collector v2.

Harvest brand domains from many curated e-commerce / Amazon-seller listicle
hubs, then crawl each brand's homepage + contact/about pages for emails using
threaded workers. Emits a candidates TSV for downstream filtering.
"""
import re, sys, urllib.request, urllib.error
from urllib.parse import urljoin, urlparse
from html import unescape
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import OrderedDict

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
LINK_RE = re.compile(r'href=["\']([^"\']+)["\']', re.I)
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

# Hubs: curated store listicles & Amazon/DTC brand directories (high persona fit)
HUBS = [
    "https://www.shopify.com/blog/shopify-stores",
    "https://www.shopify.com/blog/11863377-30-beautiful-and-creative-ecommerce-website-designs",
    "https://wisepops.com/blog/shopify-stores",
    "https://www.omnisend.com/blog/top-shopify-stores/",
    "https://printify.com/blog/shopify-store-examples/",
    "https://www.printful.com/blog/shopify-store-examples",
    "https://fastbundle.co/blog/best-shopify-stores/",
    "https://www.thegenielab.com/blogs/articles/24-best-shopify-stores-2025-secrets-to-ecommerce-success",
    "https://webinopoly.com/blogs/news/top-100-most-successful-shopify-stores",
    "https://ecomm.design/best-shopify-stores/",
    "https://builtin.com/articles/direct-to-consumer-brands",
    "https://www.shopify.com/blog/topics/podcasts",
    "https://www.shopify.com/blog/topics/podcasts?page=2",
    "https://www.shopify.com/blog/topics/podcasts?page=3",
    "https://www.shopify.com/blog/topics/founder-stories",
    "https://www.shopify.com/blog/topics/founder-stories?page=2",
    "https://www.shopify.com/blog/topics/founder-stories?page=3",
    "https://dokan.co/blog/best-shopify-stores/",
    "https://www.websitebuilderexpert.com/building-online-stores/best-shopify-stores/",
    "https://www.yotpo.com/blog/shopify-stores/",
    "https://www.bigcommerce.com/blog/shopify-stores/",
    "https://www.selz.com/blog/shopify-stores-examples/",
    "https://www.shopify.com/blog/small-business-saturday",
    "https://www.aboutamazon.com/news/small-business",
]

# High-yield Amazon FBA / importing brand & community hubs
HUBS += [
    "https://www.helium10.com/blog/amazon-fba-private-label/",
    "https://www.junglescout.com/blog/amazon-fba-private-label/",
    "https://www.iamstaffed.com/amazon-fba-sellers/",
    "https://www.sellics.com/blog/amazon-fba/",
]

BLOCK_HOSTS = ["shopify.com","amazon.com","youtube.com","instagram.com",
    "facebook.com","linkedin.com","twitter.com","x.com","pinterest.com",
    "tiktok.com","reddit.com","apple.com","spotify.com","audible.com",
    "wikipedia.org","google.com","gstatic.com","cloudflare.com","github.com",
    "medium.com","quora.com","trustpilot.com","wikihow.com","shopifycdn.com",
    "cdn.shopify.com","canva.com","beautiful.ai","hellobar.com","convertkit.com",
    "mailchimp.com","klaviyo.com","omnisend.com","wisepops.com","printify.com",
    "printful.com","fastbundle.co","thegenielab.com","webinopoly.com",
    "ecomm.design","builtin.com","dokan.co","websitebuilderexpert.com","yotpo.com",
    "bigcommerce.com","selz.com","helium10.com","junglescout.com","sellics.com",
    "iamstaffed.com"]

# Track slow hosts to skip them after repeated timeouts
slow_hosts = set()

def fetch(url, timeout=7):
    host = urlparse(url).netloc.lower()
    if host in slow_hosts:
        return None
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8","ignore")
    except Exception:
        return None

def brand_domains_from_hub(url):
    html = fetch(url)
    if not html:
        return []
    out = set()
    for m in LINK_RE.finditer(html):
        href = m.group(1)
        if href.lower().startswith(("mailto:","javascript:","#","tel:")):
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
        tld = host.split(".")[-1]
        if len(tld) < 2 or tld in ("html","php","aspx"):
            continue
        out.add(host)
    return out

def crawl_brand(domain):
    cands = []
    paths = ["","/contact","/contact-us","/about","/about-us","/pages/contact",
             "/pages/about","/get-in-touch","/support","/pages/contact-us",
             "/pages/about-us","/help","/customer-service","/store-locator"]
    seen = set()
    for path in paths:
        if len(seen) >= 4:
            break
        url = f"https://{domain}{path}"
        html = fetch(url)
        if not html:
            continue
        for em in set(EMAIL_RE.findall(unescape(html))):
            em = em.lower()
            if em in seen:
                continue
            seen.add(em)
            dom = em.split("@")[-1]
            cands.append((em, dom, url))
    return cands

def main():
    all_domains = OrderedDict()
    for h in HUBS:
        try:
            doms = brand_domains_from_hub(h)
        except Exception as e:
            print(f"# hub err {h}: {e}", file=sys.stderr)
            continue
        for d in doms:
            all_domains.setdefault(d, h)
        print(f"# hub {h}: {len(doms)} (total {len(all_domains)})", file=sys.stderr)

    rows = []
    seen_email = set()
    with ThreadPoolExecutor(max_workers=40) as ex:
        futs = {ex.submit(crawl_brand, d): d for d in all_domains}
        for fut in as_completed(futs):
            dom = futs[fut]
            hub = all_domains[dom]
            try:
                cands = fut.result()
            except Exception:
                continue
            for em, d, url in cands:
                if em in seen_email:
                    continue
                seen_email.add(em)
                rows.append((em, d, url, hub))
    print(f"# DOMAINS CRAWLED={len(all_domains)} EMAILS FOUND={len(rows)}", file=sys.stderr)
    print("# EMAIL\tDOMAIN\tSOURCE_URL\tHUB")
    for r in rows:
        print("\t".join(r))

if __name__ == "__main__":
    main()
