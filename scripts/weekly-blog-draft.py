#!/usr/bin/env python3
"""Rotate through predefined blog topics and generate a post."""
import sys
import subprocess
from pathlib import Path

# Blog cluster pivot (2026-07-20): "Shipment Stuck at Customs"
TOPICS = [
    "My shipment is stuck at customs - a step-by-step recovery checklist",
    "CBP hold types explained: EXAM, MAP, FDA, USDA, PGA and what each means",
    "Why your Amazon FBA shipment is stuck and how to get it released fast",
    "5 documents that clear a customs hold - and the one most people forget",
    "How long can customs hold my shipment legally (and what to do if it's over)",
    "Customs bond missing? Why your container is stuck and the fix",
    "HTS misclassification - the silent cause of stuck shipments",
    "Section 232 / 301 / ADD-CVD stacking and why your entry is frozen",
    "What to do when your broker goes silent on a held shipment",
    "Real importer stories: how stuck shipments got released (timelines + costs)",
]

SCRIPT = Path(__file__).resolve().parent / "generate-blog-post.py"
STATE = Path(__file__).resolve().parent / ".blog-topic-index"

idx = 0
if STATE.exists():
    try:
        idx = int(STATE.read_text(encoding="utf-8").strip())
    except Exception:
        idx = 0

topic = TOPICS[idx % len(TOPICS)]
STATE.write_text(str(idx + 1), encoding="utf-8")

result = subprocess.run(
    [sys.executable, str(SCRIPT), topic],
    cwd=str(SCRIPT.resolve().parents[1]),
    capture_output=True,
    text=True,
)

if result.returncode != 0:
    print("ERROR generating post:")
    print(result.stderr)
    sys.exit(1)

print(result.stdout.strip())
print("TOPIC_USED=" + topic)
