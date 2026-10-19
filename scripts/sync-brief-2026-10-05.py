#!/usr/bin/env python3
"""Sync docs/DAILY_OPS_BRIEF.md to ops/DAILY_OPS_BRIEF.md."""
import shutil
from pathlib import Path

REPO = Path(r"C:\Users\Najmi\Documents\Tycoon\site")
shutil.copy2(REPO / "docs" / "DAILY_OPS_BRIEF.md", REPO / "ops" / "DAILY_OPS_BRIEF.md")
print("Synced ops/DAILY_OPS_BRIEF.md <- docs/DAILY_OPS_BRIEF.md")
