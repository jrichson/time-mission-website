# Time Mission — Social Ads

## `missions-1080.html`
1080×1080 social ad featuring the homepage mission-card scroll animation.

**Preview:**
```bash
# from repo root, the static server is already running on :8080
open "http://localhost:8080/ads/missions-1080.html"
```

## Export to MP4

Deterministic capture via Playwright + ffmpeg. The page exposes `window.__setTime(t)` and `window.__setScrollPx(px)` when loaded with `?capture=1`, so every frame is scrubbed to an exact position — no drift, no dropped frames, perfectly seamless loop.

**One-time setup:**
```bash
cd ads
npm install          # installs playwright + chromium (~120MB)
```

**Render:**
```bash
# defaults: 30fps, 12s, missions-1080.mp4
node capture.mjs

# custom duration / fps / output
FPS=60 DURATION=10 OUT=missions-1080-60fps.mp4 node capture.mjs
```

Requires `ffmpeg` on PATH (`brew install ffmpeg`) and the dev server running on :8080.

**Tuning tips:**
- Shorter duration → faster perceived scroll. 8s feels punchy; 15s feels ambient.
- Meta/TikTok accept MP4 H.264; output is `yuv420p` so it plays everywhere.
- For Instagram Stories/Reels (1080×1920), duplicate the HTML and adjust viewport.
