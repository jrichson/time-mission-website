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

## Regression

- Automated gate: `npm run verify:phase5` (includes `check:booking`, Astro build, route/dist checks, ticket-panel parity, Playwright smoke).
- Smoke: `open location ?book=1 navigates to https checkout` in `tests/smoke/site.spec.js`.

## Sign-off

| Owner | Date | Pass/Fail | Notes |
|-------|------|-----------|-------|
| | | | |
