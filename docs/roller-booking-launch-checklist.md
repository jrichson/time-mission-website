# ROLLER booking launch checklist (BOOK-05)

## Scope

Human verification for **measurement readiness** after Phase 5 resolver and same-tab checkout paths ship. Intended handoff from Phase 5 toward Phase 8 cutover validation. Do not treat code checks alone as proof that purchase events fire in production analytics.

## Prerequisites

- Access to Roller **Venue Manager** or a **staging/checkout playground** that mirrors production GTM + checkout domains.
- GTM container documented (placeholder: `{GTM-XXXX}`) and published to the environment under test.
- Test card / zero-dollar flow allowed by Roller for your tenant.

## Checkout QA

1. From an open-location page, follow the live booking CTA to the external checkout URL (resolver should prefer `rollerCheckoutUrl` when set).
2. Complete a **test purchase** through staging or production policy as allowed.
3. Confirm the **thank-you / confirmation** page loads without console errors.

## dataLayer / GA4

- In GTM preview or browser devtools, confirm a **purchase** (or vendor-documented conversion) event fires after completion.
- Confirm **no PII** (full email, phone, name) is pushed in ecommerce payload unless explicitly approved.
- If checkout is on a different domain, confirm **cross-domain** / linker settings per your GTM + GA4 configuration.

## Analytics & consent (Phase 6)

- **Iframe / third-party checkout:** Measurement for sessions that complete inside ROLLER or other iframes may be limited by browser privacy rules and first-party context; treat **purchase** visibility as **conditionally observable** until validated per tenant configuration (see prerequisites above).
- **Cross-domain:** Align GA4 **cross-domain measurement** and any **linker** parameters with ROLLER’s documented hostname list and your GTM transport settings; re-test after checkout domain changes.
- **Consent:** Default **Consent Mode v2** in the Astro head denies ad/analytics storage until `TMConsent.update` (or a future CMP) grants it — verify Tag Assistant **before** relying on conversion tags in production.
- **Contract:** Browser `dataLayer` shapes are documented in `docs/analytics-event-contract.md`; future **`/api/events`** should reuse the same field names for dedupe.

## Regression

- Automated gate: `npm run verify:phase6` (includes `check:analytics`, Astro build, route/dist checks, ticket-panel parity, Playwright smoke against the repo root server).
- Smoke: `open location ?book=1 navigates to https checkout` in `tests/smoke/site.spec.js`.

## Sign-off

| Owner | Date | Pass/Fail | Notes |
|-------|------|-----------|-------|
| | | | |
