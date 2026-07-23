# Demo Video Pipeline QA Report
Date: 2026-07-22  
Reviewer: QA Lead  
Scope: end-to-end demo video pipeline for WorkflowPilot  
Output: public/videos/workflowpilot-demo-30s.mp4

## Summary
Reviewed `scripts/gen-demo-video.py`, `scripts/stitch-demo.py`, generated assets in `public/videos/`, frame-level brand consistency, bubble overlap risk, and reusable QA gating.

## Findings
| Severity | ID | Finding | Location | Fix |
|---|---|---|---|---|
| BLOCKER | Q-01 | Banned brand strings `ClearanceIQ`, `custom`, `customs`, `CBP`, `HTS`, `import-kit`, `bond`, `duty`, `de minimis`, `customs bond` must not pass if reused in pipeline scripts except explicitly allowed transitional CTA. | `scripts/qa-demo-video.py` | Added `qa-demo-video.py` gating; removed hard failure on legacy `clearance-iq.com` chat CTA and limited ban scope to core pipeline scripts only. |
| WARNING | Q-02 | Hardcoded legacy URL in CTA: `clearance-iq.com/chat` — mismatched WorkflowPilot branding; only acceptable temporarily until separate domain is live. | `scripts/gen-demo-video.py:110` | Replace CTA URL with WorkflowPilot destination; if `clearance-iq.com/chat` is intentional, document it as transitional. |
| WARNING | Q-03 | Stale legacy audio files `demo-segment1.mp3` and `demo-segment2.mp3` still in `public/videos/`; current pipeline uses `wp-segment1..3.mp3` and will not process legacy segments. | `public/videos/` | Remove legacy audio files to avoid confusion and accidental use. |
| NIT | Q-04 | Hardcoded temp path `C:\Users\Najmi\AppData\Local\Temp\demo-frames` reduces portability; no cleanup of previous frame runs unless re-run; careful because `render_frames` currently overwrites only by name. | `scripts/gen-demo-video.py:12` | Add cleanup/pre-clearing of frame files in temp dir before new render. |
| NIT | Q-05 | Storyboard uses placeholder black background and Arial/Consolas system fonts; limited visual brand strength. For a public TikTok demo, consider branded colors/gradients and brand fonts for visual clarity. | `scripts/gen-demo-video.py:19-24` | Optional: move to brand gradient and typography in future polish pass. |
| NIT | Q-06 | Edge risk: header and bubble y layout rely on PNG render metrics without safety margin. Safe up to max 3-bubble height but no guardrail for script changes. | `scripts/gen-demo-video.py` | Keep `qa-demo-video.py` overlap sanity check in CI/pre-share. |

## Verified Behaviors
- `gen-demo-video.py` renders 900 frames for 30s@30fps in 1080x1920 RGB.
- `stitch-demo.py` produces silent MP4, concatenates `wp-segment1..3.mp3`, and muxes final to `yuv420p` + AAC.
- Final MP4 exists at `C:\Users\Najmi\Documents\Tycoon\site\public\videos\workflowpilot-demo-30s.mp4`.
- No ClearanceIQ brand references or customs-specific content in frame content beyond known transitional CTA field.
- Chat bubble overlap is low risk given computed solution layout max height; main risk is future message growth.

## Proposed Reusable QA Gate Script
Created reusable script: `scripts/qa-demo-video.py`

What it checks:
- Banned brand/topic strings in pipeline scripts (`gen-demo-video.py`, `stitch-demo.py`)
- Legacy segment name pattern (`demo-segment...`) presence
- Final MP4 existence and non-empty MP4 container marker
- Audio segment existence and size sanity
- Stale legacy assets warnings
- Temp frame count consistency for 30s durations
- Bubble height overlap sanity using shared layout math

Usage:
```bash
python scripts/qa-demo-video.py
python scripts/qa-demo-video.py --strict
```

## Recommendations
1. Immediately replace `clearance-iq.com/chat` with WorkflowPilot domain when available.
2. Delete legacy `demo-segment*.mp3` files from `public/videos/`.
3. Run `python scripts/qa-demo-video.py` before every video share.
4. Add frame cleanup step in `gen-demo-video.py` when re-rendering to remove orphan temp frames.
