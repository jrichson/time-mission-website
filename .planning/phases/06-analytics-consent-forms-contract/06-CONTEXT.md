# Phase 6: Analytics, Consent & Forms Contract - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 delivers a **GTM-first**, **privacy-conscious** measurement foundation: install GTM through shared Astro head/scripts with **Google Consent Mode v2–ready** defaults, a shared browser **`track()`** / `dataLayer` contract with **non-PII** payloads and stable **`event_id`** (ANLY-01–ANLY-05), a **documented dedupe-ready contract** aligned with optional future **server-side** events (ANLY-04 **without requiring a live `/api` deployment** in this phase), **ROLLER cross-domain / GA4 documentation** for operators (ANLY-06), and **provider-flexible** contact/lead forms with preserved success/failure behavior, **form analytics without PII** (FORM-01–FORM-03), and **clean `/contact-thank-you`** as canonical (FORM-04). Scope is **instrumentation + contracts + hosting redirects/CSP**—not final Ryan/Ari GTM container tuning inside Google’s UI (that remains operator work using our dataLayer contract).

</domain>

<decisions>
## Implementation Decisions

### Consent Mode v2 bootstrap
- **D-01:** Ship **default denied** (or equivalent Consent Mode v2 **default** update) for **non-essential** storage categories the site controls at inject time—so tags that respect consent do not treat users as fully granted before an explicit UX path exists. Exact `gtag('consent', 'default', …)` keys follow Google’s current CM v2 field set during implementation.
- **D-02:** **No full cookie banner / CMP** is required inside Phase 6 **unless** a minimal stub is trivial; Phase 6 must expose a **clear JS hook** (e.g. `window.updateTmConsent({…})` / planner-named API) documented for a future banner or CMP to call `gtag('consent', 'update', …)`.
- **D-03:** **GTM container ID** (and optional env-specific IDs) come from **build-time Astro config** or env—**no secrets in repo**; use placeholder in docs where needed.

### Server-side `/api/events` (ANLY-04)
- **D-04:** Phase 6 **does not require** a deployed **Cloudflare Worker** or app server. Satisfy ANLY-04 by publishing a **single canonical event JSON shape** (TypeScript types and/or JSON Schema + narrative in `docs/`) that **browser `track()` and future POST `/api/events`** would share, including **`event_id`**, timestamps, consent snapshot fields, and dedupe notes.
- **D-05:** If a **static example POST** is helpful for Phase 8, add **`docs/analytics-event-contract.md`** (or planner-chosen name)—not a live endpoint.

### Event taxonomy & `analytics-labels.json`
- **D-06:** **`src/data/site/analytics-labels.json`** is the **canonical named constant source** for event and parameter keys used in application code. **Extend** this file when ANLY-05 requires new keys; **do not** scatter string literals for the same concepts.
- **D-07:** **GA4 / Meta / Ads event names** inside vendor tags are **GTM operator mappings** from the normalized dataLayer shape—site pushes **stable semantic events** (from D-06), not duplicate GA4-specific strings in runtime JS.

### Forms (FORM-01–FORM-04)
- **D-08:** **Provider-flexible markup**: keep **configurable `action` and `method`**; current **Netlify** attributes (`data-netlify`, honeypot) remain valid patterns on static pages; Astro contact template must preserve **equivalent** submission and thank-you navigation.
- **D-09:** **FORM-03:** Emit **start**, **submit_attempt**, **success**, and **failure** analytics with **no** name, email, phone, or message body—only **status**, **field count**, or other non-PII metadata.
- **D-10:** **FORM-04:** Canonical thank-you path is **`/contact-thank-you`**; **`/contact-thank-you.html` → `/contact-thank-you`** stays in **`_redirects`**; Astro/static output includes the thank-you page at the clean path.
- **D-11:** Preserve **honeypot / bot-field** patterns and do not log honeypot triggers with PII.

### CSP & GTM loading
- **D-12:** Update **root ` _headers` CSP** to permit **Google Tag Manager / Google tag** domains required for the standard install (`script-src`, `connect-src`, `img-src`, `frame-src` if needed). Planner verifies against [GTM] install snippet + Consent Mode—no broad `*` wildcards.
- **D-13:** **GTM / dataLayer bootstrap** loads from **`SiteHead.astro`**, **early enough** for consent default + downstream inline events; **`SiteScripts.astro`** continues to load **vanilla** feature scripts (`nav`, `locations`, `ticket-panel`, etc.) **after** measurable head contract is defined (exact order in PLAN).

### Instrumentation rollout
- **D-14:** **Wave 1** (must ship in Phase 6): GTM + consent default + **`track()` helper** + **outbound booking** + **gift card** intent events + **contact form** lifecycle (highest conversion + compliance risk).
- **D-15:** **Wave 2** (same phase if feasible; else second plan wave): **ticket panel** open/close, **location select**, **mission card** clicks, **group** CTAs—wired to the same contract.

### ROLLER / cross-domain (ANLY-06)
- **D-16:** Deliver **operator-facing documentation** (extend **`docs/roller-booking-launch-checklist.md`** or sibling doc) for **cross-domain measurement**, GA4 **referral exclusion**, and **linker** considerations—**no** PII in examples.

### Claude's Discretion
- **`event_id` generation** (UUID v4 vs deterministic hash), file placement (`js/analytics.js` vs `src/lib` compiled), and whether **`track` is an inline script** vs bundled island.
- Exact **list of Google hostnames** in CSP after research.
- **Playwright** assertions for dataLayer (level of strictness).

### Folded Todos
- None (`todo match-phase 6` returned no matches).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & v1 requirements
- `.planning/ROADMAP.md` — Phase 6 goal, success criteria (5 bullets), **Requirements** ANLY-01–ANLY-06, FORM-01–FORM-04.
- `.planning/REQUIREMENTS.md` — Full ANLY-* and FORM-* bullets and traceability table.
- `.planning/PROJECT.md` — GTM-first, Consent Mode v2-ready hooks, shared dedupe-ready payloads, no PII to analytics, provider-flexible forms.

### Prior phase contexts
- `.planning/phases/05-booking-cta-flow/05-CONTEXT.md` — Same-tab external checkout default; gift-card / dataLayer deferred to Phase 6 (D-08); booking surfaces.
- `.planning/phases/04-shared-components-template-parity/04-CONTEXT.md` — `SiteLayout`, head/script parity.
- `.planning/phases/03-validated-data-foundation/03-*` — Validated site data including `src/data/site/*`.

### Implementation anchors
- `src/components/SiteHead.astro` — Head injection point for GTM/consent.
- `src/components/SiteScripts.astro` — Deferred JS load order.
- `src/data/site/analytics-labels.json` — Event/parameter naming contract (extend in Phase 6).
- `js/ticket-panel.js`, `js/nav.js`, `js/locations.js` — Hook points for ANLY-05 behaviors.
- `contact.html`, `src/pages/contact.astro` (and partials) — Form markup parity.
- `contact-thank-you.html`, `_redirects`, `docs/redirect-map.md` — Thank-you canonical path (FORM-04).
- `_headers` — CSP updates for GTM.
- `docs/roller-booking-launch-checklist.md` — BOOK-05 / ANLY-06 documentation extension point.
- `docs/LAUNCH-TIMELINE.md` — Broader pixel/GTM timeline (ops reference; Phase 6 scope remains ROADMAP-bound).
- `.planning/research/PITFALLS.md` — Analytics, CSP, third-party pitfalls.

### External / vendor
- Google Tag Manager + Consent Mode v2 official documentation (implementation verifies current field names).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- **`src/data/site/analytics-labels.json`** — Ready to drive `track()` constants.
- **`SiteHead.astro` / `SiteScripts.astro`** — Central injection for GTM and shared runtime JS.
- **Phase 5 booking flows** — `bookOrOpenPanel`, `getBookingUrl`, location overlay hooks for conversion events.

### Established patterns
- **Netlify-style forms** on `contact.html` (`data-netlify`, honeypot).
- **Clean URL redirects** already map `contact-thank-you.html` → `/contact-thank-you`.

### Integration points
- Vanilla IIFEs in `js/` — `track()` should be callable without a framework; avoid circular load order with GTM.
- **CSP** currently allows specific third-parties (fonts, Roller); must narrow-expand for Google tags per D-12.

</code_context>

<specifics>
## Specific Ideas

- User selected **all six** discuss topics: consent, server contract, taxonomy, forms, CSP+GTM, instrumentation waves—decisions above unify them with **PROJECT.md** non-negotiables.

</specifics>

<deferred>
## Deferred Ideas

- **Full cookie banner / CMP UI** — optional later phase unless trivial stub ships with Phase 6 (D-02).
- **Live server-side event ingestion** (Worker, API) — Phase 8 / ops unless scope changes.
- **Non-GTM pixels** loaded outside GTM — ops/configuration; code changes only if CSP requires.

### Reviewed Todos (not folded)
- None.

</deferred>

---

*Phase: 06-analytics-consent-forms-contract*
*Context gathered: 2026-04-29*
