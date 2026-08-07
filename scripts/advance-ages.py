#!/usr/bin/env python3
"""Advance task ages by 3 days (2026-08-03 -> 2026-08-06)."""
import re

def advance_token(token, days=3):
    m = re.match(r'\[Pending\s+(\d+)\s*d\s+(\d+)h\]', token)
    if m:
        days_val = int(m.group(1))
        hours_val = int(m.group(2))
        new_days = days_val + days
        if hours_val >= 24:
            new_days += hours_val // 24
            hours_val = hours_val % 24
        if new_days == 0 and hours_val == 0:
            return '[Pending 0h]'
        if new_days > 0 and hours_val > 0:
            return f'[Pending {new_days}d {hours_val}h]'
        elif new_days > 0:
            return f'[Pending {new_days}d]'
        else:
            return f'[Pending {hours_val}h]'
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

def advance_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Advance all Pending tokens
    def repl(m):
        token = m.group(0)
        return advance_token(token)
    
    new_text = re.sub(r'\[Pending\s+[^\]]+\]', repl, text)
    
    # Update last briefing stamp
    new_text = re.sub(
        r'# Last briefing: \d{4}-\d{2}-\d{2}.*',
        '# Last briefing: 2026-08-06 (cron daily advance +3d from 2026-08-03)',
        new_text
    )
    
    if new_text != text:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f"Updated: {path}")
    else:
        print(f"No changes: {path}")

advance_file(r'C:\Users\Najmi\Documents\Tycoon\site\TODO.md')
advance_file(r'C:\Users\Najmi\Documents\Tycoon\site\public\TODO.md')
advance_file(r'C:\Users\Najmi\Documents\Tycoon\site\ops\daily-tasks.md')
advance_file(r'C:\Users\Najmi\Documents\Tycoon\site\public\ops\daily-tasks.md')
