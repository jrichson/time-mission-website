---
quick_id: 260506-ehf
description: Generate WebP companions for 24 experience JPGs and wire into picture markup
---

# Plan: 260506-ehf

## Goal
Generate WebP companions for the 24 experience JPGs that lack one (per t7n research inventory) and wire them into existing `<picture>` markup so browsers actually serve the smaller WebP.

## Strategy
1. `cwebp -q 78` per JPG → matching `.webp` in same directory
2. Find every `<picture><img src="<dir>/<base>.jpg" ...>` in source files (root *.html, locations/*.html, src/partials/*-main.frag.txt) — exclude dist/, public/, _archive/, .claude/worktrees/, ads/
3. Inject `<source srcset="<dir>/<base>.webp" type="image/webp">` between `<picture>` and `<img>`

## Verify
- All 24 .webp files exist in assets/photos/experiences/
- `<picture>` blocks for these JPGs now have a `<source srcset>` first
- npm run check exits 0
- No bound mismatch (source.webp must match img.jpg basename)

## Out of scope
- Markup edits to legacy locations/index.html or location pages — only triggered if those reference the 24 in `<picture><img>` form
- Filename changes
- Re-encoding existing .webp files
