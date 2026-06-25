#!/usr/bin/env python3
"""Generate a ClearanceIQ blog post from a topic and publish it."""
import sys
from datetime import datetime
from pathlib import Path

TOPIC = sys.argv[1] if len(sys.argv) > 1 else "US import customs update"
BLOG_DIR = Path(__file__).resolve().parents[1] / "blog"
TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — ClearanceIQ</title>
  <link rel="canonical" href="https://clearance-iq.com/blog/{slug}.html">
  <meta name="description" content="{excerpt}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{excerpt}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://clearance-iq.com/blog/{slug}.html">
  <meta property="og:site_name" content="ClearanceIQ">
  <link rel="stylesheet" href="/style.css">
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "{title}",
    "url": "https://clearance-iq.com/blog/{slug}.html",
    "author": {{
      "@type": "Organization",
      "name": "ClearanceIQ"
    }},
    "publisher": {{
      "@type": "Organization",
      "name": "ClearanceIQ",
      "url": "https://clearance-iq.com/"
    }}
  }}
  </script>
</head>
<body>
  <header>
    <div class="container">
      <a href="/"><span class="badge">ClearanceIQ</span></a>
      <p style="color:#cbd5e1; margin-top:10px;">ClearanceIQ US Import Customs Blog</p>
    </div>
  </header>

  <main>
    <div class="container post-body">
      <h1>{title}</h1>
      <p class="post-meta">{date} · Estimated reading: {read_time} minutes</p>
      <p class="lead">{excerpt}</p>

      <hr />

      <h2>Why this matters now</h2>
      <p>{body_1}</p>

      <h2>What changed</h2>
      <p>{body_2}</p>

      <h2>What you should do today</h2>
      <p>{body_3}</p>

      <hr />

      <h2>Get the playbook that prevents these mistakes</h2>
      <p>Step-by-step templates, HTS worksheets, and entry checklists used to pass CBP cleanly the first time.</p>
      <p><a class="cta" href="/import-kit.html">Get the ClearanceIQ Import Kit — $29.99 →</a></p>

      <p><a href="/blog/">← All posts</a> · <a href="/">Home →</a></p>
    </div>
  </main>

  <footer>
    <div class="container" style="color:#94a3b8; font-size:13px;">
      &copy; {year} ClearanceIQ · <a href="mailto:clearanceiq@proton.me" style="color:inherit;">clearanceiq@proton.me</a>
    </div>
  </footer>
</body>
</html>
"""

now = datetime.now()
slug = now.strftime("%Y-%m-%d-") + TOPIC.lower().replace(" ", "-")[:40]
title = TOPIC.title()
excerpt = f"Practical guidance on {TOPIC.lower()} for US importers and Amazon FBA sellers."
read_time = "6–8"

body_1 = (
    "Customs compliance is not a one-time event. CBP updates rules, "
    "tariffs shift, and PGA requirements change. Importers who stay current "
    "avoid the most expensive surprise: a hold or penalty that could have been "
    "prevented with one worksheet or one earlier filing."
)
body_2 = (
    "The details differ by commodity and origin country, but the pattern is "
    "consistent: incomplete documentation, missed filing windows, and undeclared "
    "AD/CVD exposure. These are not broker errors — they are data errors that "
    "happen before the broker ever sees the shipment."
)
body_3 = (
    "Start with the Compliance Checklist on ClearanceIQ. It maps every required "
    "document to the relevant CFR citation. Then run your HTS code through the "
    "lookup tool and verify AD/CVD status before you book freight. If you already "
    "have a shipment in motion, check ISF timing and bond coverage immediately."
)

post = TEMPLATE.format(
    title=title,
    slug=slug,
    excerpt=excerpt,
    date=now.strftime("%B %d, %Y"),
    read_time=read_time,
    body_1=body_1,
    body_2=body_2,
    body_3=body_3,
    year=now.year,
)

out = BLOG_DIR / f"{slug}.html"
BLOG_DIR.mkdir(parents=True, exist_ok=True)
out.write_text(post, encoding="utf-8")
print(out)
