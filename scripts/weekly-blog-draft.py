#!/usr/bin/env python3
"""Rotate through predefined blog topics and generate a post."""
import sys
import subprocess
from pathlib import Path

TOPICS = [
    "Section 321 de minimis update for importers",
    "How to avoid CBP holds on your first shipment",
    "ISF filing mistakes that cost $5000 fines",
    "When you need a customs bond and how to buy one",
    "AD CVD duties explained for Amazon sellers",
    "How to read a CBP hold notice and respond fast",
    "HTS code lookup best practices for new importers",
    "Recordkeeping requirements after CBP entry",
    "FDA prior notice requirements for food imports",
    "Country of origin marking rules and penalties",
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
