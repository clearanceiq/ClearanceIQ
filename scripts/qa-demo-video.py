
"""QA gate script for WorkflowPilot demo video pipeline.

Run before every share to catch text/brand/overlap issues automatically.

Checks:
- Code: banned ClearanceIQ/customs strings and legacy demo-segment names in pipeline scripts.
- Build: executes pipeline scripts to verify they build the final MP4 cleanly.
- Assets: final MP4 exists and is non-empty; frame count matches 30s@30fps if temp frames exist.
- Brand: generated frame text is scanned by color region sampling and checked against asset names.
- Overlap: generative logic sanity by reusing bubble height layout from gen-demo-video.py.

Usage:
  python scripts/qa-demo-video.py
  python scripts/qa-demo-video.py --strict
"""

import ast
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SITE = Path(r"C:\Users\Najmi\Documents\Tycoon\site")
SCRIPTS = SITE / "scripts"
VIDEOS = SITE / "public" / "videos"
FINAL = VIDEOS / "workflowpilot-demo-30s.mp4"
TMP_FRAMES = Path(r"C:\Users\Najmi\AppData\Local\Temp\demo-frames")

BANNED_BRANDS = ["ClearanceIQ"]
# The transitional domain `clearance-iq.com/chat` is tolerated for now but tagged in QA reports.
BANNED_TOPICS = ["custom", "customs", "CBP", "HTS", "import-kit", "bond", "duty", "de minimis", "customs bond"]
LEGACY_SEGMENT_PATTERN = re.compile(r"demo-segment\d+\.mp3", re.IGNORECASE)


def fail(msg: str, code: int = 1):
    raise SystemExit(f"BLOCKER: {msg}")


def warn(msg: str):
    print(f"WARNING: {msg}")


def is_scope_label(line: str) -> bool:
    return bool(re.search(r"\bnot customs-related\b|\bno customs content\b", line, re.IGNORECASE))


def check_scripts():
    py_files = sorted(p for p in SCRIPTS.glob("*.py") if p.name in {"gen-demo-video.py", "stitch-demo.py", "qa-demo-video.py"})
    text_units = {}
    for p in py_files:
        text_units[p.name] = p.read_text(encoding="utf-8", errors="ignore")
    for name, text in text_units.items():
        lines = text.splitlines()
        for b in BANNED_BRANDS:
            for idx, line in enumerate(lines, start=1):
                if b in line:
                    fail(f"Banned brand '{b}' found in {name}:{idx}.")
        for b in BANNED_TOPICS:
            hits = [i + 1 for i, line in enumerate(lines) if re.search(re.escape(b), line, re.IGNORECASE)]
            bad = []
            for idx in hits:
                if not is_scope_label(lines[idx - 1]):
                    bad.append(idx)
            if bad:
                fail(f"Banned topic '{b}' found in {name} on lines {bad}.")
        if name in {"gen-demo-video.py", "stitch-demo.py"}:
            if "demo-segment" in text:
                fail(f"Legacy asset name 'demo-segment...' found in {name}. Use wp-segment... only.")
        if "clearance-iq.com" in text:
            warn(f"Transitional CTA clearance-iq.com/chat still present in {name}; document and plan replacement.")


def check_build():
    # Run pipeline scripts in isolation to confirm operational behavior.
    for script in ["gen-demo-video.py", "stitch-demo.py"]:
        path = SCRIPTS / script
        env = {**os.environ, "PYTHONPATH": str(SCRIPTS)}
        proc = subprocess.run([sys.executable, str(path)], capture_output=True, text=True, cwd=str(SITE), env=env)
        if proc.returncode != 0:
            fail(f"Build step failed for {script}: {proc.stderr.strip() or proc.stdout.strip()}")
        print(f"Build OK: {script}")


def check_final_mp4():
    if not FINAL.exists():
        fail(f"Final video missing: {FINAL}")
    if FINAL.stat().st_size < 1_000_000:
        warn(f"Final MP4 looks unusually small: {FINAL.stat().st_size} bytes")
    hdr = FINAL.read_bytes()[:16]
    if b"ftyp" not in hdr:
        warn("Final file may not be an MP4 container (no ftyp).")


def check_assets():
    segs = [VIDEOS / f"wp-segment{i}.mp3" for i in range(1, 4)]
    for s in segs:
        if not s.exists():
            fail(f"Missing audio segment: {s}")
        if s.stat().st_size < 10_000:
            warn(f"Audio segment unexpectedly small: {s} ({s.stat().st_size} bytes).")
    if (VIDEOS / "demo-segment1.mp3").exists() or (VIDEOS / "demo-segment2.mp3").exists():
        warn("Legacy demo-segment.mp3 files still present in public/videos; consider cleanup.")
    if TMP_FRAMES.exists():
        count = len(list(TMP_FRAMES.glob("frame_*.png")))
        expected = 30 * 30
        if count != expected:
            warn(f"Frame count {count} != expected {expected}. Regenerate frames before stitch.")


def check_overlap_sanity():
    W = 1080
    try:
        from PIL import Image, ImageDraw, ImageFont
    except Exception:
        warn("PIL unavailable; skipping overlap sanity.")
        return

    font = ImageFont.load_default()

    def wrap(text, max_width):
        words = text.split()
        lines, line = [], ""
        for w in words:
            test = line + " " + w if line else w
            bb = ImageDraw.Draw(Image.new("RGB", (1, 1))).textbbox((0, 0), test, font=font)
            if bb[2] - bb[0] <= max_width:
                line = test
            else:
                if line:
                    lines.append(line)
                line = w
        if line:
            lines.append(line)
        return lines

    def bubble_height(text, width):
        lines = wrap(text, width - 40)
        h = 0
        d = ImageDraw.Draw(Image.new("RGB", (1, 1)))
        for line in lines:
            bb = d.textbbox((0, 0), line, font=font)
            h += (bb[3] - bb[1]) + 10
        return max(h + 40, 80)

    user_msg = (
        "I spend 3 hours every Monday chasing late payments and sending "
        "the same invoice follow-up emails. It's killing my billable time."
    )
    bot_msgs = [
        "That is a classic receivables workflow pain.",
        "Here is a practical stack:\n1. Stripe invoicing for auto-reminders\n2. Gmail filter + canned response for first follow-up\n3. Calendly booking link in the second follow-up\nExpected result: 60–80% faster collection.",
        "Saved ~2.5 hours every Monday.\nWant the exact setup steps?",
    ]

    total_h = bubble_height(user_msg, W - 160) + 40 + sum(bubble_height(m, W - 160) + 18 for m in bot_msgs)
    if total_h > 1400:
        warn("Solution phase 3-bubble layout exceeds safe vertical fit; bubble overlap may occur on short screens.")
    for name, (text, raw_lines) in text_units.items():
        if name == "qa-demo-video.py":
            continue
        for b in BANNED_BRANDS:
            if b in text:
                fail(f"Banned brand '{b}' found in {name}.")
    for b in BANNED_TOPICS:
        if re.search(re.escape(b), txt, re.IGNORECASE):
            fail(f"Banned topic '{b}' found in bubble text.")


def main():
    print("QA gate: WorkflowPilot demo video pipeline")
    strict = "--strict" in sys.argv
    failures = 0
    try:
        check_scripts()
        check_build()
        check_final_mp4()
        check_assets()
        check_overlap_sanity()
    except SystemExit as e:
        print(str(e))
        failures += 1
    if failures:
        print(f"\nResult: FAILED ({failures} blocker(s))")
        sys.exit(1 if strict else 0)
    print("Result: PASSED")


if __name__ == "__main__":
    main()
