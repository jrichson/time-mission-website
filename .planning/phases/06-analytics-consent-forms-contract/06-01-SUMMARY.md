# Plan 06-01 — Summary

**Done:** `SiteHead.astro` wires `window.__TM_ANALYTICS_LABELS__`, `dataLayer`, `gtag`, Consent Mode v2 **default denied** for ad/analytics storage, conditional GTM loader from `PUBLIC_GTM_CONTAINER_ID`, noscript iframe. `js/consent-bridge.js` exposes `window.TMConsent.update`. `_headers` CSP allows GTM/GA4 script, frame, connect hosts. `docs/analytics-event-contract.md` added.

**Verify:** `npm run build:astro` with/without `PUBLIC_GTM_CONTAINER_ID`.
