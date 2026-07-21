"""
Generate a TikTok-style explainer MP4 for ClearanceIQ.
- 9:16 (1080x1920), 30fps, ~35s
- Scenes: title → problem → 3 tips → CTA → logo hold
"""
import os, textwrap, numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio

W, H = 1080, 1920
FPS = 30
OUT = r"C:\Users\Najmi\Documents\Tycoon\site\public\videos\clearanceiq-import-kit-tiktok.mp4"

# ---------- palette / assets ----------
NAVY   = (15, 23, 42)
GREEN  = (34, 197, 94)
WHITE  = (226, 232, 240)
MUTED  = (148, 163, 184)
ORANGE = (251, 146, 60)
RED    = (239, 68, 68)

LOGO_PATH = r"C:\Users\Najmi\Documents\Tycoon\site\public\assets\clearanceiq-logo.png"
FONT_BOLD = None
FONT_REG  = None
FONT_MONO = None

def load_fonts():
    global FONT_BOLD, FONT_REG, FONT_MONO
    try:
        FONT_BOLD = ImageFont.truetype("arial.ttf", 72)
        FONT_REG  = ImageFont.truetype("arial.ttf", 52)
        FONT_MONO = ImageFont.truetype("arial.ttf", 40)
    except Exception:
        FONT_BOLD = ImageFont.load_default()
        FONT_REG  = ImageFont.load_default()
        FONT_MONO = ImageFont.load_default()

# ---------- helpers ----------
def new_canvas(col=NAVY):
    return Image.new("RGB", (W, H), col)

def centered_text(draw, y, text, font, fill, canvas_w=W):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (canvas_w - tw) // 2
    draw.text((x, y), text, font=font, fill=fill)

def draw_wrapped_center(draw, y, text, font, fill, max_w=980, line_gap=14):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_w and cur:
            lines.append(cur); cur = w
        else:
            cur = test
    if cur:
        lines.append(cur)
    for line in lines:
        centered_text(draw, y, line, font, fill)
        y += (draw.textbbox((0,0), line, font=font)[3] - draw.textbbox((0,0), line, font=font)[1]) + line_gap
    return y

def progress_bar(draw, y, pct, w=900, h=14, fill=GREEN, bg=(30,41,59)):
    x = (W - w) // 2
    draw.rectangle([x, y, x + w, y + h], fill=bg)
    draw.rectangle([x, y, x + int(w * max(0, min(1, pct))), y + h], fill=fill)

# ---------- scenes ----------
def scene_logo(duration_s=4):
    """Title card: logo + tagline"""
    frames = []
    logo = None
    if os.path.exists(LOGO_PATH):
        try:
            im = Image.open(LOGO_PATH).convert("RGBA")
            im.thumbnail((900, 260))
            logo = im
        except Exception:
            logo = None
    for f in range(int(duration_s * FPS)):
        img = new_canvas(NAVY)
        d = ImageDraw.Draw(img)
        centered_text(d, 720, "CLEARANCEIQ", FONT_BOLD, WHITE)
        centered_text(d, 830, "Don't guess the import.", FONT_REG, MUTED)
        if logo:
            img.paste(logo, ((W - logo.width)//2, 560), logo)
        progress_bar(d, 1060, f / (duration_s * FPS))
        frames.append(np.array(img))
    return frames

def scene_problem(duration_s=5):
    """'Your shipment is stuck at US customs'"""
    frames = []
    msgs = [
        "Your shipment is",
        "STUCK at",
        "US CUSTOMS",
    ]
    for f in range(int(duration_s * FPS)):
        img = new_canvas((10, 15, 30))
        d = ImageDraw.Draw(img)
        y = 680
        for i, line in enumerate(msgs):
            col = RED if i == 2 else WHITE
            centered_text(d, y, line, FONT_BOLD if i == 2 else FONT_REG, col)
            y += 110 if i == 2 else 80
        # subtext
        y += 80
        for sub in ["CBP hold — EXAM / MAP / PGA", "Bond expired — can't release", "Entry mismatch — demurrage clock ticking"]:
            centered_text(d, y, "• " + sub, FONT_MONO, MUTED)
            y += 58
        progress_bar(d, 1640, f / (duration_s * FPS))
        frames.append(np.array(img))
    return frames

def scene_tips(duration_s=10):
    """3 tips, 3s each, numbered"""
    tips = [
        ("1. Check ACE portal", "Look up your entry number. The hold code tells you exactly what CBP wants."),
        ("2. Match your docs", "Commercial invoice, packing list, and 7501 HTS must all agree word-for-word."),
        ("3. Pre-stage CPC/GCC", "CPSC-covered products need certificates BEFORE the container lands. CPSC eFiling is free."),
    ]
    frames = []
    total = len(tips) * FPS * 3
    for idx, (title, body) in enumerate(tips):
        for f in range(3 * FPS):
            img = new_canvas(NAVY)
            d = ImageDraw.Draw(img)
            # number badge
            bbox = d.textbbox((0, 0), str(idx + 1), font=FONT_BOLD)
            tw = bbox[2] - bbox[0] + 40
            d.rectangle([(W - tw)//2 - 20, 620, (W + tw)//2 + 20, 720], fill=GREEN)
            centered_text(d, 632, str(idx + 1), FONT_BOLD, NAVY)
            centered_text(d, 760, title, FONT_BOLD, WHITE)
            centered_text(d, 870, body, FONT_REG, MUTED)
            progress_bar(d, 1640, (idx * 3 * FPS + f) / total)
            frames.append(np.array(img))
    return frames

def scene_cta(duration_s=8):
    """CTA: Import Kit + URL"""
    frames = []
    texts = [
        "25 customs worksheets",
        "HTS · Bond · CBP hold",
        "entry checklists",
    ]
    for f in range(int(duration_s * FPS)):
        img = new_canvas((10, 14, 30))
        d = ImageDraw.Draw(img)
        centered_text(d, 720, "Get the Import Kit", FONT_BOLD, GREEN)
        y = 840
        for t in texts:
            centered_text(d, y, t, FONT_REG, WHITE)
            y += 80
        y += 80
        centered_text(d, y, "RM19.99 — Instant download", FONT_MONO, MUTED)
        # url
        url = "clearance-iq.com/import-kit"
        centered_text(d, y + 70, url, FONT_MONO, ORANGE)
        progress_bar(d, 1640, f / (duration_s * FPS))
        frames.append(np.array(img))
    return frames

def scene_outro(duration_s=3):
    frames = []
    for f in range(int(duration_s * FPS)):
        img = new_canvas(NAVY)
        d = ImageDraw.Draw(img)
        centered_text(d, 820, "ClearanceIQ", FONT_BOLD, WHITE)
        centered_text(d, 920, "clearance-iq.com", FONT_REG, ORANGE)
        frames.append(np.array(img))
    return frames

# ---------- render ----------
def main():
    load_fonts()
    print("Rendering scenes...")
    all_frames = (
        scene_logo(4) +
        scene_problem(5) +
        scene_tips(10) +
        scene_cta(8) +
        scene_outro(3)
    )
    print(f"Total frames: {len(all_frames)} (~{len(all_frames)/FPS:.0f}s at {FPS}fps)")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    w = imageio.get_writer(OUT, fps=FPS, quality=7, macro_block_size=1)
    for i, frame in enumerate(all_frames):
        w.append_data(frame)
    w.close()
    sz = os.path.getsize(OUT)
    print(f"Wrote {OUT} ({sz//1024} KB)")

if __name__ == "__main__":
    main()
