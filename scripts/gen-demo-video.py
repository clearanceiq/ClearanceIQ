"""Generate 30s demo video — GENERAL SME pain point, not customs-related.
Brand: WorkflowPilot.
Pain: invoice follow-ups.
"""
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SITE = Path(r"C:\Users\Najmi\Documents\Tycoon\site")
OUT_DIR = SITE / "public" / "videos"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_FRAMES = Path(r"C:\Users\Najmi\AppData\Local\Temp\demo-frames")
TMP_FRAMES.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
FPS = 30
TOTAL_SEC = 30
TOTAL_FRAMES = FPS * TOTAL_SEC

BG = "#0f1117"
BOT_BUBBLE = "#2563eb"
USER_BUBBLE = "#374151"
TEXT_WHITE = "#f3f4f6"
TEXT_DIM = "#9ca3af"
ACCENT = "#3b82f6"
RECEIPT_BG = "#111827"
GREEN_OK = "#10b981"

try:
    font_title = ImageFont.truetype("arial.ttf", 56)
    font_body = ImageFont.truetype("arial.ttf", 42)
    font_small = ImageFont.truetype("arial.ttf", 30)
    font_mono = ImageFont.truetype("consola.ttf", 26)
except Exception:
    font_title = font_body = font_small = font_mono = ImageFont.load_default()

def new_frame():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    return img, draw

def wrap_text(text, font, max_width):
    words = text.split()
    lines, line = [], ""
    for w in words:
        test = line + " " + w if line else w
        draw = ImageDraw.Draw(Image.new("RGB", (1, 1)))
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width:
            line = test
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines

def bubble_height(text, font, width):
    lines = wrap_text(text, font, width - 40)
    h = 0
    draw = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        h += (bbox[3] - bbox[1]) + 10
    return max(h + 40, 80)

def draw_chat_bubble(draw, x, y, width, text, font, fill, text_color=TEXT_WHITE, radius=24):
    bh = bubble_height(text, font, width)
    draw.rounded_rectangle([x, y, x + width, y + bh], radius=radius, fill=fill)
    lines = wrap_text(text, font, width - 40)
    ty = y + 20
    for line in lines:
        draw.text((x + 20, ty), line, font=font, fill=text_color)
        bbox = draw.textbbox((0, 0), line, font=font)
        ty += (bbox[3] - bbox[1]) + 8
    return y + bh + 18

PAIN_SEC = 5
SOL_SEC = 11
RECEIPT_SEC = 7
CTA_SEC = 7

USER_MSG = (
    "I spend 3 hours every Monday chasing late payments and sending "
    "the same invoice follow-up emails. It's killing my billable time."
)

BOT_MESSAGES = [
    "That is a classic receivables workflow pain.",
    "Here is a practical stack:\n1. Stripe invoicing for auto-reminders\n2. Gmail filter + canned response for first follow-up\n3. Calendly booking link in the second follow-up\nExpected result: 60–80% faster collection.",
    "Saved ~2.5 hours every Monday.\nWant the exact setup steps?",
]

RECEIPT_LINES = [
    "WorkflowPilot Session",
    "────────────────────",
    "Pain solved: Invoice follow-up backlog",
    "Old way: 3 hours every Monday",
    "New way: 30 minutes automated",
    "Time saved: 2.5 hours/week",
    "Monthly recovered: ~10 hours",
]

CTA_LINES = [
    "Your first AI operations assistant.",
    "Tell it what is slowing you down.",
    "It matches the right tool or agent.",
    "Free. No login. No card.",
    "Chat now → yourdomain.com/chat",
]

def render_frames():
    frames = []
    for f in range(TOTAL_FRAMES):
        t = f / FPS
        img, draw = new_frame()

        draw.rectangle([0, 0, W, 130], fill="#111827")
        draw.text((60, 35), "WorkflowPilot Demo", font=font_title, fill=TEXT_WHITE)

        if t < PAIN_SEC:
            y_cursor = 280
            if t > 0.4:
                y_cursor = draw_chat_bubble(draw, 80, y_cursor, W - 160, USER_MSG, font_body, USER_BUBBLE)
                draw.text((80, y_cursor), "Solo founder, every Monday", font=font_small, fill=TEXT_DIM)

        elif t < PAIN_SEC + SOL_SEC:
            st = t - PAIN_SEC
            y_cursor = 200
            y_cursor = draw_chat_bubble(draw, 80, y_cursor, W - 160, USER_MSG, font_body, USER_BUBBLE)
            draw.text((80, y_cursor), "Solo founder, every Monday", font=font_small, fill=TEXT_DIM)
            y_cursor += 40

            msg_duration = 3.5
            num_visible = min(int(st / msg_duration) + 1, len(BOT_MESSAGES))
            for i in range(num_visible):
                msg_start = i * msg_duration
                if st >= msg_start:
                    msg_progress = min((st - msg_start) / 0.7, 1.0)
                    text = BOT_MESSAGES[i]
                    if msg_progress < 1.0:
                        display_len = max(1, int(len(text) * msg_progress))
                        while display_len < len(text) and text[display_len] != "\n":
                            display_len += 1
                        text = text[:display_len]
                    y_cursor = draw_chat_bubble(draw, 80, y_cursor, W - 160, text, font_body, BOT_BUBBLE)
                    if i == num_visible - 1 and num_visible < len(BOT_MESSAGES) and (st - msg_start) < 1.0:
                        draw.text((80, y_cursor), "Bot is typing...", font=font_small, fill=TEXT_DIM)

            visible_duration = num_visible * msg_duration
            if st > visible_duration + 0.3:
                bx = W - 340
                by = 460
                draw.rounded_rectangle([bx, by, bx + 260, by + 72], radius=16, fill=GREEN_OK)
                draw.text((bx + 20, by + 16), "Saved ~2.5 hrs", font=font_small, fill=TEXT_WHITE)

        elif t < PAIN_SEC + SOL_SEC + RECEIPT_SEC:
            st = t - (PAIN_SEC + SOL_SEC)
            y = 360
            rx = (W - 700) // 2
            card_h = len(RECEIPT_LINES) * 56 + 60
            draw.rounded_rectangle([rx - 20, y - 20, rx + 720, y + card_h], radius=24, fill=RECEIPT_BG)
            for i, line in enumerate(RECEIPT_LINES):
                col = ACCENT if i == 0 else TEXT_WHITE
                draw.text((rx, y + i * 56), line, font=font_mono, fill=col)
            if st > 1.5:
                draw.text((rx, y + card_h + 20), "Same pain every week — until now", font=font_body, fill=GREEN_OK)

        else:
            st = t - (PAIN_SEC + SOL_SEC + RECEIPT_SEC)
            y = 420
            for i, line in enumerate(CTA_LINES):
                col = ACCENT if i == 0 else TEXT_WHITE
                size = font_title if i == 0 else font_body
                delay = i * 0.4
                if st >= delay:
                    draw.text((80, y + i * 80), line, font=size, fill=col)
            draw.text((80, H - 160), "WorkflowPilot — Free. No login.", font=font_small, fill=TEXT_DIM)

        frames.append(img)

    return frames

print("Rendering frames...")
frames = render_frames()
print(f"Generated {len(frames)} frames")
for i, frame in enumerate(frames):
    frame.save(TMP_FRAMES / f"frame_{i:05d}.png")
print("Frames saved.")
