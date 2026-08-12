#!/usr/bin/env python3
"""Advance ages in all ClearanceIQ task artifacts to 2026-08-13."""
import re, os

TODAY = "2026-08-13"

FILES = {
    r"C:\Users\Najmi\Documents\Tycoon\site\ops\daily-tasks.md": ("2026-08-12", 1),
    r"C:\Users\Najmi\Documents\Tycoon\site\public\ops\daily-tasks.md": ("2026-08-12", 1),
    r"C:\Users\Najmi\Documents\Tycoon\site\TODO.md": ("2026-08-10", 3),
    r"C:\Users\Najmi\Documents\Tycoon\site\public\TODO.md": ("2026-08-12", 1),
    r"C:\Users\Najmi\Documents\Tycoon\site\docs\TASKS.md": ("2026-08-12", 1),
}

def advance_token(token, days):
    m = re.match(r'\[Pending\s+(\d+)\s*d\s+(\d+)h\]', token)
    if m:
        days_val = int(m.group(1))
        hours_val = int(m.group(2))
        new_days = days_val + days
        new_hours = hours_val
        if new_hours >= 24:
            new_days += new_hours // 24
            new_hours = new_hours % 24
        if new_days == 0 and new_hours == 0:
            return '[Pending 0h]'
        if new_days > 0 and new_hours > 0:
            return f'[Pending {new_days}d {new_hours}h]'
        elif new_days > 0:
            return f'[Pending {new_days}d]'
        else:
            return f'[Pending {new_hours}h]'
    m = re.match(r'\[Pending\s+(\d+)d\]', token)
    if m:
        days_val = int(m.group(1))
        new_days = days_val + days
        return f'[Pending {new_days}d]'
    m = re.match(r'\[Pending\s+(\d+)h\]', token)
    if m:
        hours_val = int(m.group(1))
        new_hours = hours_val + days * 24
        if new_hours >= 24:
            new_days = new_hours // 24
            rem_hours = new_hours % 24
            if rem_hours > 0:
                return f'[Pending {new_days}d {rem_hours}h]'
            else:
                return f'[Pending {new_days}d]'
        return f'[Pending {new_hours}h]'
    return token

def advance_file(path, old_stamp_date, days):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Normalize CRLF for reliable regex
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    def repl(m):
        return advance_token(m.group(0), days)

    new_text = re.sub(r'\[Pending\s+[^\]]+\]', repl, text)

    # Replace entire stamp line
    new_text = re.sub(
        r'^# Last briefing:.*$',
        f'# Last briefing: {TODAY} (cron daily advance +{days}d from {old_stamp_date})',
        new_text,
        flags=re.M
    )

    # For docs/TASKS.md, update **Last updated:** stamp
    if 'TASKS.md' in path:
        new_text = re.sub(
            r'^\*\*Last updated:\*\*.*$',
            f'**Last updated:** {TODAY}',
            new_text,
            flags=re.M
        )

    if new_text != text:
        # Write in binary mode to avoid CRLF doubling on Windows
        with open(path, 'wb') as f:
            f.write(new_text.replace('\n', '\r\n').encode('utf-8'))
        print(f"Updated: {path}")
    else:
        print(f"No changes: {path}")

for path, (stamp_date, days) in FILES.items():
    advance_file(path, stamp_date, days)
