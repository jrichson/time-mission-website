---
quick_id: 260506-ehf
date: 2026-05-06
commit: 3ac7677
status: complete
---

# 260506-ehf: WebP companions + markup wiring

## Outcome

24 new `.webp` files written to `assets/photos/experiences/`. `missions.html` now has `<source srcset>` for 20 of those 24 (the rest are referenced as og:image meta or background images, not `<picture><img>`).

## WebP file sizes (cwebp -q 78)

| File | Size |
|------|------|
| _Time-Mission_0076.webp | 281 KB |
| Time-Mission_Looking_Glass.webp | 239 KB |
| Time-Mission_Sea_Lab.webp | 230 KB |
| Time-Mission_Dystopian_Forest.webp | 209 KB |
| Time-Mission_Paleontologists_Study.webp | 167 KB |
| _Time-Mission_0077.webp | 145 KB |
| Time-Mission_Piano_Piano.webp | 135 KB |
| Time-Mission_Lovecraft_Circle.webp | 132 KB |
| Time-Mission_Head_Hunter.webp | 127 KB |
| Time-Mission_Machine_Gut.webp | 122 KB |
| Time-Mission_Egyptian_Tomb.webp | 119 KB |
| _Time-Mission_0517.webp | 111 KB |
| Time-Mission_Magma_Mayhem-2.webp | 110 KB |
| Time-Mission_Mayan_Court.webp | 109 KB |
| Time-Mission_Martian_Greenhouse.webp | 102 KB |
| Time-Mission_Koi_Gardens.webp | 101 KB |
| Time-Mission_Element_Zero.webp | 93 KB |
| Time-Mission_Tartarus_Abyss.webp | 92 KB |
| Time-Mission_Alien_Awakening.webp | 90 KB |
| Time-Mission_Flash_Back.webp | 80 KB |
| Time-Mission_Castle_Conquest.webp | 72 KB |
| Time-Mission_Orbital_Relay.webp | 66 KB |
| Time-Mission_Private_Eye.webp | 57 KB |
| Time-Mission_Submarine_Plunge.webp | 51 KB |

WebP saves an additional ~30-50% over the dxi-compressed JPGs on supporting browsers.

## Markup change

`missions.html` only — 20 `<picture>` blocks gained `<source srcset="...webp" type="image/webp">`.

## Defect caught and fixed mid-run

First regex pass mismatched filenames — wired `Castle_Conquest.webp` into `Sea_Lab`'s `<picture>` because the regex allowed `<picture>` and `<img>` to span across other `<picture>` blocks. Caught immediately on visual spot-check, reverted via `git checkout -- missions.html`, tightened the regex to require `<picture>` directly adjacent to `<img>` with no characters between, re-ran. 13 (buggy) → 20 (correct) replacements.

## Verification

- `npm run check` exits 0
- Spot-check: `Sea_Lab`, `Egyptian_Tomb`, `Castle_Conquest` all show matching webp/jpg pair
- 25 staged files (1 modified .html + 24 new .webp), no extras

## Follow-up candidates

- Wire WebP into og:image / share image meta (where applicable)
- Background image WebP via CSS `image-set()` for the 4 unused-in-picture base names
- Apply same WebP wiring to legacy location/groups main fragments if any reference these JPGs in `<picture>` form
