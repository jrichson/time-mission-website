# Phase 06 — Technical Research

**Phase:** Analytics, Consent & Forms Contract  
**Date:** 2026-04-29  
**Sources:** `06-CONTEXT.md`, `REQUIREMENTS.md` (ANLY-*, FORM-*), `SiteHead.astro`, `SiteScripts.astro`, `src/data/site/analytics-labels.json`, `_headers`, `contact.html`, `js/ticket-panel.js`, `js/nav.js`, `js/locations.js`

---

## Summary

Ship **GTM + Consent Mode v2–ready defaults** from **`SiteHead.astro`** (container ID via **`PUBLIC_GTM_CONTAINER_ID`**, no ID = omit GTM snippet for local dev). Add **`js/analytics.js`** with **`window.TMAnalytics.track(event, payload)`** (or planner-chosen global) that **normalizes** pushes to `dataLayer` using **`analytics-labels.json`** constants, **`event_id`** (crypto.randomUUID or fallback), timestamps, **`page_path`**, **`consent`** snapshot keys, and **never** PII. Document **shared JSON contract** for future `/api/events` (**ANLY-04**). Tighten **`_headers` CSP** for `googletagmanager.com` / `google-analytics.com` (and any tag-sync domains GTM loads). **Forms:** preserve **Netlify**-style markup; non-PII **form lifecycle** events; ensure **Astro + static** expose **`/contact-thank-you`**. **Instrument** booking/gift/CTA/ticket-panel/location/mission surfaces in **two waves** per CONTEXT. Extend **roller-booking-launch-checklist** for **ANLY-06**. Add **`check-analytics-contract.js`** + **`verify:phase6`**.

---

## Current Behavior (baseline)

| Area | Finding |
|------|---------|
| GTM / dataLayer | **Not** in `SiteHead.astro`; no site-wide analytics bootstrap. |
| `analytics-labels.json` | Exists with **eventNames** / **parameters** — not wired to runtime JS. |
| CSP `_headers` | **No** `googletagmanager.com`; adding GTM **requires** explicit `script-src` / `connect-src` updates. |
| Contact form | **Netlify** (`data-netlify`, honeypot); `action` to thank-you path. |
| Thank-you | **`contact-thank-you.html`** + `_redirects` → `/contact-thank-you`; Astro page may be missing. |
| Booking CTAs | `ticket-panel.js`, `nav.js`, `locations.js` — **ready for** `track()` hooks post–Phase 5 same-tab behavior. |

---

## Recommended Approach

1. **Head order:** Inline **dataLayer** init → **`gtag('consent','default',…)`** (or GTM-recommended Consent Mode snippet for 2025–2026 field set) → **GTM loader** (only if `PUBLIC_GTM_CONTAINER_ID` non-empty) → expose **`window.TMConsent.update(...)`** (name per PLAN) calling **`gtag('consent','update',…)`**.

2. **`js/analytics.js`:** Loaded in **`SiteScripts.astro`** **after** head contracts; depends on `dataLayer`; **idempotent** init.

3. **Checks:** Node script asserts **`analytics.js`** references label file concepts, forbids obvious PII keys in push payloads (e.g. `email`, `message`), and **`check`** wires into `npm run check`.

4. **Forms:** Dedicated small **`js/contact-form-analytics.js`** or section in **`analytics.js`** — listen `focusin`/`submit`/`netlify` success patterns without reading fields.

5. **CSP:** Minimize broadening — add only hosts from Google’s current GTM install doc + GA4 measurement.

---

## Pitfalls

- **Empty GTM ID in CI/build** — must not throw; smoke tests run without real container.
- **CSP** blocking **inline** consent bootstrap — may need **`'unsafe-inline'`** already present for site; verify GTM **nonce** strategy vs static site (often hash or keep minimal inline).
- **PII leakage** — form `track` must use **status-only** metadata.
- **Load order** — `track` before `ticket-panel` if panel open fires on parse? Usually after DOM — load `analytics.js` before feature scripts that call `track`.

---

## Validation Architecture

| Dimension | Mechanism |
|-----------|-----------|
| GTM + consent present | `grep` / `check-analytics-contract.js` for snippet markers + consent default |
| CSP | Manual review + optional script `check-headers-csp.js` if added in PLAN |
| Non-PII | `check-analytics-contract.js` banned keys list |
| Forms | Playwright: contact page load + optional `dataLayer` event after interaction |
| Build | `npm run build:astro` + `verify:phase6` |

Wave 0 is **not required** — extend existing Playwright + `npm run check`.

---

## Security Notes

**Analytics** risks: **accidental PII** in `dataLayer` (mitigate via schema + static check); **third-party script** supply chain (mitigate minimal domains + Subresource Integrity if Google documents); **CSP** too loose (mitigate explicit host list).

---

## RESEARCH COMPLETE
