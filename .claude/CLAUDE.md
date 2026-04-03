# time-mission-website

## Purpose
Marketing website for Time Mission, LOL Entertainment's immersive gaming brand. Dark sci-fi themed design with Orbitron + DM Sans typography.

## Tech Stack
- Static HTML/CSS/JS (no build system)
- Google Fonts: Bebas Neue, DM Sans, Orbitron
- CSS custom properties for design tokens

## Key Files
- `index.html` — homepage
- `experiences.html` — game listings
- `groups.html` — group bookings
- `gift-cards.html` — gift cards
- `faq.html` — FAQ
- `contact.html` — contact page
- `locations/` — per-city pages (philadelphia, houston, chicago, antwerp, west-nyack, manassas, lincoln)
- `css/variables.css` — extracted design tokens
- `assets/photos/` — experience + venue photography
- `assets/logo/` — TM logos and favicon
- `assets/news/` — press outlet logos
- `assets/mockup-reference/` — design mockups
- `docs/` — design docs, location data, launch plan
- `HANDOFF.md` — developer handoff document
- `_archive/` — old experiments (stat-cards, brand-dna, stats-demo)

## Commands
```bash
open index.html                         # Preview
open -a "Google Chrome" index.html      # Chrome preview
```

## Notes
- All styles are currently inline in each HTML page (~500-1000 lines each)
- Photos in assets/photos/ are unoptimized (5-19MB) — need compression for production
- Design tokens extracted to css/variables.css but not yet linked from HTML files
