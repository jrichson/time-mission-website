---
phase: 06-analytics-consent-forms-contract
status: draft
kind: analytics-forms
---

# Phase 6 — UI Design Contract (parity-first)

## Scope

Phase 6 **does not** introduce a visible **cookie banner** or **consent UI** unless an executor adds a **minimal stub** per `06-CONTEXT.md` D-02. **Default consent** is set **programmatically** in the head for Consent Mode v2–ready behavior.

## Visual parity

- **Forms:** Field layout, labels, errors, and success navigation match **existing** `contact.html` / Astro contact template — **no redesign**.
- **Thank-you page:** Content and layout **parity** with `contact-thank-you.html` (or improved only for semantic/SEO parity if already equivalent).

## Interaction

- **`window.TMConsent.update`** (final name per PLAN): callable by **future** banner; **no new** user-facing control required in Phase 6.
- **Form analytics:** No extra UI; events fire from **native** form behavior.

## Accessibility

- No regression to form **labels**, **focus order**, or **error announcements**.

## Out of scope

- CMP branding, preference center UI, new modals for analytics.

---

*Phase 6 UI contract — instrumentation layer only.*
