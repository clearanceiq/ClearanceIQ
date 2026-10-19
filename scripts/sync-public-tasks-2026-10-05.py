#!/usr/bin/env python3
"""Sync public mirror task artifacts to match canonical sources.
Resolves age drift between canonical and public copies."""
import shutil
from pathlib import Path

REPO = Path(r"C:\Users\Najmi\Documents\Tycoon\site")

sync_pairs = [
    (REPO / "ops" / "daily-tasks.md", REPO / "public" / "ops" / "daily-tasks.md"),
    (REPO / "TODO.md", REPO / "public" / "TODO.md"),
    (REPO / "docs" / "TASKS.md", REPO / "public" / "docs" / "TASKS.md"),
]

for src, dst in sync_pairs:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f"Synced: {src.relative_to(REPO)} -> {dst.relative_to(REPO)}")
