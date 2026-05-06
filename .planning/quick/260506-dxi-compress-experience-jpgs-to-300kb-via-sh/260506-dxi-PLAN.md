---
quick_id: 260506-dxi
description: Compress experience JPGs to ≤300KB via sharp recompression
---

# Plan: 260506-dxi

## Goal
Reduce `assets/photos/experiences/*.jpg` from 4-12MB each to ≤300KB target. No markup changes. No filename changes.

## Strategy
- Tool: `sharp` CLI (installed at `/usr/local/bin/sharp`)
- Pipeline per JPG: `resize 1920` (max width, preserve aspect) → `jpeg --quality 80 --mozjpeg --progressive` → write back
- Overwrite source files in place
- Run inline as a single bash loop (no executor agent needed)

## Out of scope
- WebP companion generation (separate task)
- `<picture>` markup updates
- venue/, groups/, instagram/ subdirs (size-OK except top outliers)
- TM_Big-Bang.jpg at root (12MB) — IS in scope as it's an experience photo

## Tasks
1. Inventory: list all JPGs ≥500KB in `assets/photos/experiences/` and the root `TM_Big-Bang.jpg`
2. Recompress each via sharp resize + mozjpeg
3. Verify size reduction with `du -ch` before/after
4. Spot-check 2 files visually (open in Preview)
5. Run `npm run check` to confirm no regression
6. Commit with `git add` per-file (NEVER `-A`)

## Verify
- All target JPGs ≤350KB (allowing slight overage on hero-sized files)
- `npm run check` exits 0
- No other files staged
