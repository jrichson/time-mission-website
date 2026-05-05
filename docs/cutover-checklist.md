# Time Mission Astro Migration — Cutover Checklist

Status: in progress
Origin: Phase 10 plan 10-07 (Audit-Gap Closure & Cutover Readiness)
Cross-links:
- [docs/rollback-runbook.md](./rollback-runbook.md)
- [docs/cloudflare-preview-validation.md](./cloudflare-preview-validation.md)
- [docs/roller-booking-launch-checklist.md](./roller-booking-launch-checklist.md)

> Audit findings closed by Phase 10 code changes are documented in the SUMMARY files
> under `.planning/phases/10-audit-gap-closure-cutover-readiness/`. This document covers
> items that ship outside the Astro repo: host config, GTM container changes, DNS,
> asset compression, and brand sign-off.

## Code Changes (auto-verified by `npm run verify:phase10`)

| Check | Gate | Closed Finding(s) |
|-------|------|-------------------|
| `npm run check:schema-output` | All open-location LocalBusiness JSON-LD declares `name="Time Mission [City]"`; Antwerp emits `alternateName="Experience Factory Antwerp"` | P0-5, P0-8 (already shipped via quick 260504-lsk) |
| `npm run check:img-alt-axe` | Zero critical/serious axe image-alt violations across all 22 dist HTML files (page navigation uses `waitUntil: 'load'` so autoplay hero `<video>` doesn't block the run) | P0-4 |
| `npm run check:hreflang-cluster` | Antwerp dist emits `<html lang="nl-BE">`; US pages emit `<html lang="en">`; no cross-city `<link rel="alternate" hreflang>` (locked D-02) | P1-9 |
| `npm run check:tap-targets` | Nav buttons declare `min-height >= 44px`; booking CTAs declare `min-height >= 48px` (CSS-source heuristic against `css/base.css` + `css/nav.css`) | P1-1 |
| `npm run check:a11y` (extended) | Every Astro page has SSR skip-link + `<main id="main">` + landmark structure | P1-3, P0-4 partial |
| `npm run check:astro-dist` | All 22 Astro pages render (incl. 6 legal pages from 10-03 + antwerp from 10-04) | P1-16 |
| Mobile Playwright project (`@playwright/test` Pixel 5 device) | `tap` on location-link keeps overlay open + reveals info panel; `e.stopPropagation()` patch in `js/nav.js` prevents bubble to overlay-background close handler | P0-7a |
| Manual visual confirmation | Hero video on `index.html` is `aria-hidden="true" tabindex="-1"` (locked D-01: decorative) | P1-12 |
| Manual GTM DebugView | `web_vitals` event with LCP/CLS/INP visible in dataLayer on at least homepage + one location page after consent grant | P2-1 |
| Manual visual smoke | Cookie banner appears on `dist/antwerp.html`, absent on `dist/philadelphia.html` (locked D-03 EU-only via `consent_profile === 'us_open'` early-return) | P2-4 |

## Host Dependencies (human-verified, NOT automated)

| Finding | Owner | Action | Verification Step | Status |
|---------|-------|--------|-------------------|--------|
| P1-7 | Web Dev | Cloudflare case-insensitive routing | Follow [docs/cloudflare-preview-validation.md](./cloudflare-preview-validation.md) — test `/FAQ`, `/Philadelphia` (mixed case) → expect 200 with canonical lower-case redirect | [ ] not started |
| P1-10 | Product + Brand | ROLLER / Experience Factory brand strategy decision | Confirm whether "Experience Factory" surfaces anywhere on-site post-cutover (e.g., legacy schema fields, copy on coming-soon Brussels page, ROLLER widget defaults). Document decision in this row. | [ ] not started |
| P1-11 | GTM Admin | FB & TikTok pixel `domain=.timemission.com` | Fix `domain` attribute on Meta Pixel + TikTok Pixel tags inside the GTM container (NOT in repo); verify in GTM Preview before publish; confirm no cross-subdomain cookie loss after cutover | [ ] not started |
| P1-17 | DevOps | `tickets.timemission.com` DNS + CSP allowlist | Two safe paths: (a) deploy `tickets.timemission.com` subdomain DNS+TLS so the existing CSP entry resolves; OR (b) migrate Philadelphia + West Nyack + Lincoln booking URLs from `tickets.timemission.com` to `ecom.roller.app` first, then remove from `_headers` `frame-src`/`connect-src`. The current `_headers` retains the entry — booking would break if removed prematurely. | [ ] not started |
| P2-8 | Designer | Re-export `share-image.jpg` (586 KB → ~150 KB target) | Compressed file delivered; replace at original path under `assets/`; rebuild dist; confirm OG/Twitter card preview still renders correctly | [ ] not started |
| P2-9 | Designer + Web Dev | Compress `brochure.pdf` (11.7 MB → ~2–3 MB target) | Compressed PDF delivered; replace at original path under `assets/`; confirm download link still resolves and PDF still readable | [ ] not started |
| P2-10 | DevOps | `api-1.timemission.com` open CORS | If endpoint is PII-bound, narrow `Access-Control-Allow-Origin` to `https://timemission.com`; if not PII-bound, document acceptance with rationale in this row | [ ] not started |

## Manual Reviews

### P2-6 — Brand Compliance Review

**Owner:** Designer
**Method:** Open representative Astro pages in a browser (`dist/index.html`, `dist/philadelphia.html`, `dist/antwerp.html`, `dist/groups/birthdays.html`, `dist/terms.html`, `dist/contact.html`) and compare against `assets/mockup-reference/` screenshots and brand-dna folder.

**Pass criteria:**

- [ ] Color palette matches brand tokens (orange accent, dark surfaces; see `css/variables.css` — `--orange`, `--dark`, `--gradient-primary`)
- [ ] Typography matches brand (Bebas Neue display, DM Sans body, Orbitron tech)
- [ ] Imagery matches mockup reference (no missing photos, no broken assets, hero video plays on index/location pages)
- [ ] Hero treatment matches reference (video on index/philadelphia/houston/antwerp; per `docs/hero-medium-audit.md` zero `<img>` heroes shipped this phase, so no `<picture>`/srcset regressions to spot-check)
- [ ] Spacing rhythm matches reference (no obvious gap regressions on legal pages from 10-03 shared-CSS partial refactor)
- [ ] Cookie banner brand styling on EU pages matches `css/cookie-consent.css` overrides (dark background, orange accent, gradient on Accept all)

**Resume:** Designer signs off OR files specific defect items in `STATE.md` blockers.

### P1-12 — Hero Video Decorative (locked decision D-01)

**Owner:** Web Dev (verification only — decision is locked to "decorative")

**Verification:** `grep 'aria-hidden="true" tabindex="-1"' src/partials/index-main.frag.txt | grep "heroVideo"` returns the `<video id="heroVideo">` line. Confirm in `dist/index.html` after build.

- [ ] Confirmed: hero video shipped with `aria-hidden="true" tabindex="-1"`

## Post-Cutover Polish (non-blocking — defer to Phase 11+)

### POLISH-01 — Cookie banner placement + brand-aligned styling

**Owner:** Designer + Web Dev
**Status:** Deferred. Current banner is GDPR-compliant; this is a UX/brand polish iteration.

**Context:** Phase 10 ships the default `vanilla-cookieconsent` v3 bottom-center cloud layout on EU pages (per locked D-03). It satisfies all GDPR requirements (1-click reject, equal prominence, no consent wall) but the placement competes with the mobile thumb-reach zone where the sticky `.btn-tickets` Book Now CTA lives, and the visual treatment is library-default rather than brand-native.

**Recommended spec:**

- **Layout:** bottom-left card, 380px max-width desktop / `calc(100vw - 32px)` mobile. Anchor 16-24px from bottom and left edges. Z-index above page content but below `.btn-tickets` on mobile so the sticky CTA stays clickable through the gap.
- **Visual:** dark surface (`rgba(20,20,24,0.92)` background + `backdrop-filter: blur(12px) saturate(1.1)`), 1px `--orange` border at 18% opacity, 12px radius, `0 10px 40px rgba(0,0,0,0.4)` shadow.
- **Hierarchy:** Orbitron 14px uppercase heading (`We use cookies`); DM Sans 14px body; equal-prominence Accept all (`--orange` filled) and Reject all (outlined `--orange`); Manage Preferences as text-only tertiary below the button row.
- **Motion:** slide-up + fade in 220ms `cubic-bezier(0.32, 0.72, 0, 1)` on mount.
- **Mobile (< 640px):** full-width minus 16px gutter, anchored 16px above bottom edge to clear iOS Safari's home indicator. Buttons stack vertically with 8px gap; Accept on top.

**Implementation notes:**

- All changes are CSS-only — `vanilla-cookieconsent` exposes `.cm--cloud` / `.cm--bar` / `.cm--box` layout classes. Switch to `.cm--box` and override `position` + alignment in `css/cookie-consent.css`.
- No JS or markup changes; consent gate behavior in `js/cookie-consent.js` stays untouched.
- Verify `npm run check:tap-targets` still passes (button min-heights stay ≥ 44/48 px).

**Pass criteria:**

- [ ] Banner renders in bottom-left card layout on `/antwerp` desktop
- [ ] Banner renders full-width minus 16px gutter on mobile, above iOS home indicator
- [ ] Accept and Reject are visually equal prominence (size, weight, contrast)
- [ ] Manage Preferences is tertiary text-only style
- [ ] `npm run check:tap-targets` exit 0
- [ ] `npm run check:img-alt-axe` exit 0 (sanity)

## Final Pre-Cutover Sequence

1. Run `npm run verify:phase10` — must exit 0.
2. All Host Dependencies above either Done or explicitly Deferred (with rationale logged in `STATE.md`).
3. P2-6 brand compliance review signed off (or specific defects logged + resolved).
4. Run [docs/cloudflare-preview-validation.md](./cloudflare-preview-validation.md) checklist on a real Cloudflare Pages preview deployment.
5. Confirm GTM DebugView shows `web_vitals` events on homepage + one location page after consent grant.
6. Confirm cookie banner appears on Antwerp; absent on Philadelphia (locked D-03 EU-only).
7. Final rollback sanity: confirm [docs/rollback-runbook.md](./rollback-runbook.md) is current and the `pre-astro-migration-baseline` git tag exists.
8. Cutover.
