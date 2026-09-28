#!/usr/bin/env python3
"""Fix last-briefing stamps to 2026-09-24 (today's date) for all ClearanceIQ task artifacts.
The advance-ages-today.py script did NOT update stamps because TODAY was hardcoded to 2026-08-13.
This fixes the stamp lines only — ages were already advanced correctly by the prior script."""
import re, os

TODAY = "2026-09-24"

FILES = [
    r"C:\Users\Najmi\Documents\Tycoon\site\ops\daily-tasks.md",
    r"C:\Users\Najmi\Documents\Tycoon\site\public\ops\daily-tasks.md",
    r"C:\Users\Najmi\Documents\Tycoon\site\TODO.md",
    r"C:\Users\Najmi\Documents\Tycoon\site\public\TODO.md",
    r"C:\Users\Najmi\Documents\Tycoon\site\docs\TASKS.md",
]

def fix_stamp(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    orig = text

    # Fix # Last briefing: line
    new_text = re.sub(
        r'^# Last briefing:.*$',
        f'# Last briefing: {TODAY} (cron daily advance from 2026-09-22)',
        text,
        flags=re.M
    )
    # Fix **Last updated:** for docs/TASKS.md
    if 'TASKS.md' in path:
        new_text = re.sub(
            r'^\*\*Last updated:\*\*.*$',
            f'**Last updated:** {TODAY}',
            new_text,
            flags=re.M
        )
    if new_text != orig:
        with open(path, 'wb') as f:
            f.write(new_text.replace('\n', '\r\n').encode('utf-8'))
        print(f"Fixed stamp: {path}")
    else:
        print(f"No stamp change: {path}")

for p in FILES:
    fix_stamp(p)
