"""Stitch demo frames + TTS audio into final MP4.
New branding: WorkflowPilot. Audio segments: wp-segment1..3.mp3
"""
import subprocess
from pathlib import Path

SITE = Path(r"C:\Users\Najmi\Documents\Tycoon\site")
VIDEOS = SITE / "public" / "videos"
TMP_FRAMES = Path(r"C:\Users\Najmi\AppData\Local\Temp\demo-frames")
FFMPEG = r"C:\Users\Najmi\AppData\Local\hermes\hermes-agent\venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

frames = sorted(TMP_FRAMES.glob("frame_*.png"))
print(f"Frames found: {len(frames)}")
assert frames, "No frames found"

# Step 1: frames -> silent mp4
silent = VIDEOS / "demo-silent.mp4"
subprocess.run([
    FFMPEG, "-y", "-framerate", "30",
    "-i", str(TMP_FRAMES / "frame_%05d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-crf", "23", "-preset", "fast",
    str(silent)
], check=True, capture_output=True, text=True)
print(f"Silent video: {silent.stat().st_size} bytes")

# Step 2: concat audio
segs = [VIDEOS / f"wp-segment{i}.mp3" for i in range(1, 4)]
concat_list = VIDEOS / "demo-concat.txt"
concat_list.write_text("".join(f"file '{p.name}'\n" for p in segs))
combined_audio = VIDEOS / "demo-audio.mp3"
subprocess.run([
    FFMPEG, "-y", "-f", "concat", "-safe", "0",
    "-i", str(concat_list),
    "-c", "copy", str(combined_audio)
], check=True, capture_output=True, text=True)
print(f"Combined audio: {combined_audio.stat().st_size} bytes")

# Step 3: mux
FINAL = VIDEOS / "workflowpilot-demo-30s.mp4"
subprocess.run([
    FFMPEG, "-y",
    "-i", str(silent),
    "-i", str(combined_audio),
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
    str(FINAL)
], check=True, capture_output=True, text=True)
print(f"Final: {FINAL} ({FINAL.stat().st_size} bytes)")

# cleanup
for p in [silent, combined_audio, concat_list]:
    try: p.unlink()
    except: pass
print("Done.")
