---
quick_id: 260506-dxi
date: 2026-05-06
commit: 35faf5d
status: complete
---

# 260506-dxi: Compress experience JPGs

## Outcome

38 JPGs in `assets/photos/experiences/` (plus `assets/photos/TM_Big-Bang.jpg`) recompressed in place. Total dir size: ~120MB → 13MB.

## Pipeline

```
sharp -i <input> -o /tmp/img-compressed/ -f jpeg -q 78 --mozjpeg --progressive resize 1600
```

One stubborn file (`_Time-Mission_0076.jpg`, high-frequency detail) needed q=70/1400px to hit 296KB.

## Notable reductions

| File | Before | After |
|------|--------|-------|
| TM_Big-Bang.jpg | 12.0 MB | 219 KB |
| Time-Mission_Sea_Lab.jpg | 8.0 MB | 262 KB |
| Time-Mission_Looking_Glass.jpg | 7.3 MB | 266 KB |
| Time-Mission_Paleontologists_Study.jpg | 6.7 MB | 222 KB |
| Time-Mission_Egyptian_Tomb.jpg | 5.8 MB | 171 KB |
| Time-Mission_Dystopian_Forest.jpg | 5.7 MB | 236 KB |

## What didn't change

- Filenames (preserved for markup compatibility)
- HTML/Astro markup
- WebP companions (existing ones unchanged; 24 JPGs still lack WebP companions — separate follow-up)
- venue/, instagram/, groups/ subdirs (size-OK)

## Verification

- `npm run check` exits 0
- All 38 files ≤300KB
- 38 staged files in commit 35faf5d, no extras

## Follow-up candidates

- WebP companion generation for the 24 experience JPGs without one (research already noted them in t7n)
- Visual spot-check by user in browser to confirm no objectionable quality regression
