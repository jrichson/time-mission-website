# Phase 09 — Delivered summary

**Status:** Delivered (2026-04-30). Architecture RFC program **closed** (2026-05-01). Optional CSS partial split is discretionary backlog only.

Single place for work that was executed across several sessions after Phase 8 was marked complete.

---

## A. Architecture deepening (maps to `ARCHITECTURE-DEEPENING-PHASES.md`)

| RFC phase | Delivered | Key artifacts |
|-----------|-----------|-----------------|
| **1** Ticket options SSoT | Yes | `src/lib/ticket-options.ts`, `scripts/lib/derive-ticket-options-from-locations.ts`, `scripts/check-site-contract.js`, `TicketPanel.astro` |
| **2** Route artifacts | Yes | `scripts/compile-route-artifacts.mjs`, wired into compile/check/sync; regenerates `src/data/site/astro-rendered-output-files.json` |
| **3** Embed vs runtime drift | Yes | `src/lib/locations-fingerprint.ts`, fingerprint on public contract, `site_contract_stale` in `analytics-labels.json` + `js/analytics.js` + `js/locations.js`, smoke coverage |
| **4** Event-template CSS | **Closed (RFC)** | Duplicate ticket-panel block removed from `src/partials/birthdays-inline.raw.css.txt`; named partials (`event-hero`, etc.) **deferred** to optional backlog — out of RFC scope |
| **5** Policy runner | Yes | `scripts/lib/policy-runner.js`, `scripts/policies/booking-policies.cjs`, thin `check-booking-architecture.js`, Vitest / `test:unit` in check chain |
| **6** Browser façade | Yes | `window.TMFacade` in `js/booking-controller.js`, `docs/tm-public-api.md`, unit tests |

---

## B. UI / template hygiene (parity)

| Item | Notes |
|------|--------|
| **SiteFooter** | Full legacy-style `footer-grid` (brand, accordions, legal) vs simplified component |
| **css/footer.css** | Newsletter rules scoped under `.footer-newsletter` so global footer styles don’t fight page sections |
| **css/newsletter.css** | Scoped under `.newsletter-section`; centered “Don’t Miss A Thing” layout; subscribe button sizing |
| **Homepage** | Removed duplicate newsletter rules from `src/partials/index-inline.raw.css.txt`; bumped asset query versions where needed |
| **Ticket panel off-layout pages** | `src/pages/privacy.astro` and `src/pages/faq.astro` include `/css/ticket-panel.css` so `TicketPanel` stays `position: fixed` (no phantom content below footer) |

---

## C. Analytics / measurement (documentation only)

Cross-domain **purchase** stitching (GA4/GTM linker + Roller hostnames) remains **operator-configured** per `docs/roller-booking-launch-checklist.md` and `docs/gtm-operator-runbook.md`. Site code continues to fire `checkout_start` / `booking_click` before outbound HTTPS checkout.

---

## Follow-ups (optional, non-RFC)

1. **CSS cleanup:** Split `birthdays-inline.raw.css.txt` (and siblings if needed) into 2–3 named partials or `css/event-type/*` imports if maintainers want smaller partials (not required for closed RFC success criteria).
2. **Linux CI:** Committed Playwright screenshot baselines for `chromium-linux` if CI runs on Ubuntu (`STATE.md` concern).

---

## Sign-off

| Owner | Date | Notes |
|-------|------|-------|
| — | — | Fill when formal QA complete |
