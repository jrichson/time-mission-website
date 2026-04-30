# Phase 05 — Technical Research

**Phase:** Booking & CTA Flow  
**Date:** 2026-04-29  
**Sources:** `05-CONTEXT.md`, `05-UI-SPEC.md`, live repo (`js/ticket-panel.js`, `js/roller-checkout.js`, `scripts/check-booking-architecture.js`, `src/components/SiteScripts.astro`)

---

## Summary

Implement **validated external checkout** as the default path: **`rollerCheckoutUrl` then `bookingUrl`** for open locations in `getBookingUrl` / shared resolver logic; **remove ROLLER iframe CDN injection and capture-phase interception** from `js/roller-checkout.js` (BOOK-03, D-02); reconcile **`bookOrOpenPanel`** to **same-tab** `location.assign` for `https:` URLs (D-01); preserve **`?book=1`** on location pages via existing `scheduleAutoRedirect` after resolver fix (BOOK-04); extend **static checks** and **Playwright**; document **BOOK-05** launch checklist (GTM/purchase validation when Venue Manager exists).

---

## Current Behavior (baseline)

| Area | Finding |
|------|---------|
| `getBookingUrl` | Uses **only** `loc.bookingUrl` — ignores `rollerCheckoutUrl` (violates D-03 when Roller URL differs). |
| `#ticketBookBtn` | Click handler **`removeAttribute('target')`** + **`window.location.href`** — already same-tab for panel continuation. |
| `bookOrOpenPanel` | **`window.open(href, '_blank')`** for `https:` — conflicts with D-01 default for nav/global CTAs. |
| `roller-checkout.js` | **Injects** `checkout_iframe.js` CDN + **capture-phase** listener calling `RollerCheckout.show()` — default iframe path (remove per BOOK-03). |
| `SiteScripts.astro` | Loads **`/js/roller-checkout.js?v=1`** between locations and ticket-panel (ordering matters for TM readiness). |
| Coming-soon | `getBookingUrl` returns **internal location path** — aligns with BOOK-02/D-07. |

---

## Recommended Approach

1. **Single resolver** inside `js/ticket-panel.js` (or tiny `js/booking-url.js` loaded **before** ticket-panel only if splitting reduces risk — default **keep one file** to avoid load-order regressions):  
   `open` → `(trim(rollerCheckoutUrl) || trim(bookingUrl) || '')`; **mailto/tel** preserved via existing `bookingUrl` shapes.

2. **`roller-checkout.js`**: Replace implementation with **no-op** (empty IIFE + file-header documentation pointing to BOOK-03 and optional fallback procedure). Keeps hundreds of legacy `<script src="js/roller-checkout.js">` references valid without a mass HTML edit in Wave 1.

3. **`check-booking-architecture.js`**: Replace assertions that required Roller-specific strings inside `roller-checkout.js` with assertions that **forbid** `checkout_iframe.js` / `RollerCheckout.show` **or** confirm stub documentation marker string agreed in PLAN.

4. **Smoke tests**: Update expectations if href targets change when resolver prefers `rollerCheckoutUrl`; add **`?book=1`** location-page case if missing.

---

## Pitfalls

- **Double navigation:** Removing capture-phase listener eliminates ordering fights between roller-checkout and ticket-panel — verify **one** `preventDefault` path per button.
- **Antwerp mailto:** Resolver must return **mailto** `bookingUrl` when no `rollerCheckoutUrl`.
- **Parity scripts:** Changing ticket-panel markup/cache-buster may trigger `check-ticket-panel-parity` — avoid unnecessary `v=` bumps.

---

## Validation Architecture

Phase execution validates booking behavior through **existing Node check scripts**, **grep-verifiable source constraints**, and **Playwright smoke** against the local static server. No new Jest/Vitest suite — aligns with repo conventions.

| Dimension | Mechanism |
|-----------|-----------|
| Correct outbound URL shape | `check-location-contracts.js` (HTTPS/mailto rules) + extended `check-booking-architecture.js` |
| No default iframe | Source must not load `cdn.rollerdigital.com/scripts/widget/checkout_iframe.js` on default path |
| Runtime flows | `tests/smoke/site.spec.js` — homepage ticket panel hrefs; optional location `?book=1` |
| BOOK-05 | Manual/automation checklist markdown + CI gate optional |

Wave 0 is **not required** — infrastructure exists.

---

## Security Notes

Removing third-party **checkout iframe script injection** reduces **supply-chain / CSP** exposure from Roller CDN on every page load. Booking URLs remain **vendor-controlled** outbound links — document as accepted transfer of trust.
