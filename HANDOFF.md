# Time Mission Website - Developer Handoff

## Overview

Marketing website for **Time Mission**, LOL Entertainment's immersive gaming brand. Dark sci-fi themed with vibrant accent colors.

**Target launch:** ~May 8, 2026
**Current state:** Static HTML/CSS prototypes — needs CMS integration and production build system.

---

## Site Map & Page Status

### Core Pages (root)
| Page | File | Lines | Status |
|------|------|-------|--------|
| Homepage | `index.html` | 3,376 | Draft complete |
| Experiences | `experiences.html` | 1,513 | Draft complete |
| Group Bookings | `groups.html` | 2,453 | Draft complete |
| Gift Cards | `gift-cards.html` | 1,364 | Draft complete |
| FAQ | `faq.html` | 1,166 | Draft complete |
| Contact | `contact.html` | 1,293 | Draft complete |

### Location Pages (`locations/`)
| Page | File | Status |
|------|------|--------|
| Locations Hub | `locations/index.html` | Draft complete |
| Philadelphia | `locations/philadelphia.html` | Full build |
| Houston | `locations/houston.html` | Full build |
| Antwerp | `locations/antwerp.html` | Partial |
| West Nyack | `locations/west-nyack.html` | Partial |
| Manassas | `locations/manassas.html` | Partial |
| Lincoln | `locations/lincoln.html` | Partial |
| Chicago | `locations/chicago.html` | Minimal |

---

## Tech Stack

- **Current:** Static HTML with inline `<style>` and `<script>` tags per page
- **Fonts:** Google Fonts — Bebas Neue, DM Sans, Orbitron
- **No build system** — files open directly in browser

---

## Design System

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--orange` | `#FF6B2C` | Primary CTA, brand accent |
| `--orange-light` | `#FF8F5C` | Hover states |
| `--orange-dark` | `#E55A1F` | Active states |
| `--cyan` | `#00E5FF` | Secondary accent |
| `--magenta` | `#FF00E5` | Tertiary accent |
| `--lime` | `#AAFF00` | Highlight accent |
| `--black` | `#0D0D0D` | Page background |
| `--dark` | `#151515` | Card/section backgrounds |
| `--dark-light` | `#1F1F1F` | Elevated surfaces |

### Gradients
| Token | Value |
|-------|-------|
| `--gradient-primary` | `linear-gradient(135deg, #f9a41a 0%, #ef4b23 50%, #c7451e 100%)` |
| `--gradient-secondary` | `linear-gradient(135deg, #00E5FF 0%, #AAFF00 100%)` |
| `--gradient-accent` | `linear-gradient(90deg, #f9a41a 0%, #ef4b23 50%, #c7451e 100%)` |

### Typography
| Role | Font | Weight |
|------|------|--------|
| Display/Headlines | Bebas Neue | 400 |
| Body text | DM Sans | 400, 500, 600, 700 |
| Tech/data labels | Orbitron | 400-900 |

Extracted tokens live in `css/variables.css`.

---

## Directory Structure

```
time-mission-website/
├── index.html              # Homepage
├── experiences.html         # Game listings
├── groups.html              # Group bookings
├── gift-cards.html          # Gift cards
├── faq.html                 # FAQ
├── contact.html             # Contact
├── locations/               # Per-city pages
│   ├── index.html           # Locations hub
│   ├── philadelphia.html
│   ├── houston.html
│   ├── chicago.html
│   ├── antwerp.html
│   ├── west-nyack.html
│   ├── manassas.html
│   └── lincoln.html
├── css/
│   └── variables.css        # Design tokens (extracted)
├── js/                      # Shared scripts (to be extracted)
├── assets/
│   ├── logo/                # Brand logos + favicon
│   ├── photos/
│   │   ├── experiences/     # Game photography (12 images)
│   │   └── venue/           # Venue photography (6 images)
│   ├── news/                # Press logos (NBC, FOX, CBS, etc.)
│   ├── mockup-reference/    # Design mockups (desktop + mobile)
│   ├── mission/             # Mission SVG graphic
│   └── extracted/           # Extracted animations/videos
├── docs/
│   ├── DESIGN-DOCUMENTATION.md
│   ├── LAUNCH-TIMELINE.md
│   ├── locations-snapshot-2026-04-22.json  # Historical reference snapshot (see data/locations.json for live data)
│   └── TM-Website-Launch-Plan.xlsx
└── _archive/                # Old experiments (not for production)
```

---

## Assets Notes

- **Photos are unoptimized** — experience photos are 5-19MB, venue photos 6-11MB. Need compression/resizing for web.
- **Hero video** — Placeholder folder exists but no video yet. Currently using static hero.
- **Team photos** — None yet. May need for About/Team section.
- **Logos** — Only favicon versions (PNG + SVG). May need full logo SVGs.

---

## Known Issues / TODO for Production

1. **CMS integration** — All content is hardcoded. Need CMS for locations, experiences, FAQ, etc.
2. **Image optimization** — Compress all photos, serve responsive sizes (srcset)
3. **CSS extraction** — Styles are inline in each HTML file, ~500-1000 lines per page. Extract to shared stylesheets.
4. **JS extraction** — Scripts are inline. Extract navigation, animations, carousels to shared modules.
5. **SEO** — Meta descriptions, OG tags, structured data need review
6. **Analytics** — No tracking installed
7. **Forms** — Contact form needs backend
8. **Booking integration** — CTAs link to external booking but may need deeper integration
9. **Accessibility** — Needs audit (contrast, ARIA labels, keyboard nav)
10. **Performance** — Large images, no lazy loading, no CDN

---

## Reference Docs

- `docs/DESIGN-DOCUMENTATION.md` — Design system history and rationale
- `data/locations.json` — Live location data read by `js/locations.js`. **This is the source of truth.** Edit here, not in `docs/`.
- `docs/locations-snapshot-2026-04-22.json` — Historical snapshot from the old timemission.com site (reference only, do not edit for live changes)
- `docs/LAUNCH-TIMELINE.md` — Launch milestones
- `assets/mockup-reference/` — Original design mockups (desktop + mobile PNGs)
