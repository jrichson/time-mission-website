// Pixel-perfect MP4 capture of missions-1080.html.
//
// Renders the page in Chromium at an exact 1080x1080 viewport, scrubs the
// scroll and glow animations deterministically via window.__setTime/__setScrollPx,
// saves one PNG per frame, then pipes them through ffmpeg into an MP4.
//
// Usage:
//   cd ads
//   npm install           # installs playwright + downloads chromium
//   node capture.mjs      # defaults: 30fps, 12s loop, missions-1080.mp4
//
// Env overrides:
//   FPS=60 DURATION=10 OUT=missions-1080-60fps.mp4 node capture.mjs
//   URL=http://localhost:8080/ads/missions-1080.html node capture.mjs
//
// Requires: ffmpeg on PATH, the static site served on localhost:8080
// (or any URL via URL env var).

import { chromium } from 'playwright';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FPS = Number(process.env.FPS || 30);
const DURATION = Number(process.env.DURATION || 12);      // seconds of final video
const OUT = process.env.OUT || 'missions-1080.mp4';
const URL = process.env.URL || 'http://localhost:8080/ads/missions-1080.html?capture=1';
const CRF = Number(process.env.CRF || 18);                 // quality (lower = better)

const totalFrames = FPS * DURATION;
const framesDir = path.join(__dirname, '.frames');

// Sanity check ffmpeg.
try {
    spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
    console.error('ffmpeg not found on PATH. Install with: brew install ffmpeg');
    process.exit(1);
}

if (existsSync(framesDir)) rmSync(framesDir, { recursive: true });
mkdirSync(framesDir);

console.log(`Capturing ${totalFrames} frames (${FPS}fps × ${DURATION}s) from ${URL}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({
    viewport: { width: 1080, height: 1080 },
    deviceScaleFactor: 1,
});
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30_000 });

const halfWidth = await page.evaluate(() => window.__halfWidth);
console.log(`halfWidth=${halfWidth}px (one full seamless loop)`);

const t0 = Date.now();
for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;                  // 0..1 across the video
    const virtualTime = progress * DURATION;           // 0..DURATION seconds
    const scrollPx = progress * halfWidth;             // 0..halfWidth (seamless)

    await page.evaluate(
        ({ vt, px }) => { window.__setTime(vt); window.__setScrollPx(px); },
        { vt: virtualTime, px: scrollPx }
    );

    const out = path.join(framesDir, `f_${String(i).padStart(5, '0')}.png`);
    await page.screenshot({
        path: out,
        clip: { x: 0, y: 0, width: 1080, height: 1080 },
        omitBackground: false,
    });

    if (i % 15 === 0 || i === totalFrames - 1) {
        const pct = Math.round((i / totalFrames) * 100);
        process.stdout.write(`\r  frame ${i + 1}/${totalFrames}  (${pct}%)   `);
    }
}
console.log(`\nCaptured in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

await browser.close();

const outPath = path.resolve(__dirname, OUT);
console.log(`Encoding → ${outPath}`);
execSync(
    [
        'ffmpeg', '-y',
        '-framerate', String(FPS),
        '-i', path.join(framesDir, 'f_%05d.png'),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-crf', String(CRF),
        '-preset', 'slow',
        '-movflags', '+faststart',
        outPath,
    ].map(a => a.includes(' ') ? `"${a}"` : a).join(' '),
    { stdio: 'inherit' }
);

rmSync(framesDir, { recursive: true });
console.log(`Done: ${outPath}`);
