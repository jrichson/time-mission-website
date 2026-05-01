# Architecture deepening — phased plan (6 workstreams)

RFC-style backlog derived from the “improve codebase architecture” analysis. Phases are ordered by **dependency, risk reduction, and cutover safety** for the Astro/static migration.

---

## Guiding principles

- **Single source of truth** per concept (ticket labels, routes, policy rules).
- **Verify at the boundary** (`npm run verify` / Playwright) after each phase; no phase widens scope without a green gate.
- **Prefer build-time compilation** over manual duplicate edits (manifests, generated JS snippets).

---

## Phase 0 — Preconditions (ongoing)

| Item | Action |
|------|--------|
| Baseline | `npm run verify` green on `main` (or active migration branch). |
| Scope | Treat `dist/` + `routes.json` as contract consumers; avoid drive-by legacy HTML edits in the same PRs as deep refactors. |

**Exit:** None (standing discipline).

---

## Phase 1 — Ticket options: one authoritative derivation

**Cluster:** `src/lib/site-contract.ts`, `js/locations.js` (`listTicketOptions`), `scripts/lib/derive-ticket-options-from-locations.cjs`, `TicketPanel.astro`, `check-site-contract.js`.

**Goal:** Exactly **one** implementation of `{ value, label, status }` rules (including coming-soon suffix and fallback behavior assumptions).

**Tasks**

1. Introduce `src/lib/ticket-options.ts` (or fold into `site-contract.ts`) as the **only** definition of `ticketPanelSelectOptions(locations)`.
2. Choose one consumption path for browser bundle:
   - **Option A:** Build step writes a tiny `js/generated/ticket-options-core.js` included by `locations.js`, **or**
   - **Option B:** Document that `listTicketOptions` delegates to inlined build output (same hash as server).
3. Replace `derive-ticket-options-from-locations.cjs` with `require` of compiled TS or generated JSON from the same function.
4. Tighten `check-site-contract.js`: assert **structural equality** against the canonical module (fixture `locations`), not string substrings about comments.

**Dependency category:** In-process (pure mapping).

**Verify:** `npm run verify`; spot-check ticket panel in browser for open + coming-soon labels.

**Exit:** No triplicated `map`; comments like “must match X” removed in favor of one module + tests.

---

## Phase 2 — Route graph: derive manifests from `routes.json`

**Cluster:** `src/data/routes.json`, `src/data/site/astro-rendered-output-files.json`, sitemap expectations, `scripts/check-astro-dist-manifest.js`, `sync-static-to-public.mjs`.

**Goal:** Humans edit **`routes.json` (and Astro pages)**; **machines emit** expected dist filenames / skip lists.

**Tasks**

1. Add `scripts/compile-route-artifacts.mjs` (or extend `route-artifacts.js`) to emit:
   - `astro-rendered-output-files.json` contents (or a schema that the manifest check reads), and/or
   - A single `route-graph.json` consumed by `check-internal-links` + manifest check.
2. Wire emission into `npm run build:astro` **or** `npm run check` preamble (document which).
3. Remove hand-edited duplication in `astro-rendered-output-files.json` where entries are fully determined by registry + known Astro routes.
4. Optional lint: `definePage({ canonicalPath })` on each Astro page must match a registry row.

**Dependency category:** Local-substitutable (`dist/` / filesystem).

**Verify:** `npm run verify`; add/adjust one route in dev and confirm a single edit path surfaces all failures until artifacts are regenerated.

**Exit:** No parallel “manifest vs registry” mental model for deployable HTML paths.

---

## Phase 3 — Site contract embed vs runtime (drift signal)

**Cluster:** `getPublicSiteContract()`, `SiteScripts.astro`, `locations.json` fetch in `js/locations.js`, smoke tests.

**Goal:** Build-time embed stays **small and JSON-safe**, but detects **stale** client data vs build without duplicating full option payloads.

**Tasks**

1. Extend `PublicSiteContract` with a **`locationsFingerprint`** (e.g. hash of sorted location ids + status, or file hash at build).
2. After `TM.load()`, if fingerprint differs from embed, push a **non-PII** analytics queue event (e.g. `SITE_CONTRACT_STALE`) once per session — spec in `analytics-labels.json` + `check-analytics-contract.js`.
3. Document: rebuild/deploy when `locations.json` changes; fingerprint is diagnostic, not a user-facing error.

**Dependency category:** In-process (build) + browser (fetch).

**Verify:** `npm run verify`; manual test: bump local JSON without rebuild and confirm event (non-prod).

**Exit:** Operators can see mismatch in GTM/debug without silent divergence.

---

## Phase 4 — Event-template CSS decomposition

**Cluster:** `src/partials/birthdays-inline.raw.css.txt`, shared `css/ticket-panel.css`, `css/variables.css`, group Astro pages.

**Goal:** Shrink the megapartial; align with shared component CSS.

**Tasks**

1. Delete **duplicate** ticket-panel rules from the inline partial where `ticket-panel.css` already matches production.
2. Split inline bundle into 2–3 **named** partials or real files under `css/event-type/` imported in `SiteLayout` or group layout only:
   - `event-hero.css`, `event-sections.css`, `event-faq-overrides.css` (names illustrative).
3. Keep visual regression snapshots passing; update thresholds only for intentional changes.

**Dependency category:** In-process.

**Verify:** `npm run verify` (including Playwright visual).

**Exit:** No ticket-panel “fork” inside raw inline; file boundaries map to page regions.

---

## Phase 5 — Verification: centralized policy runner

**Cluster:** `scripts/check-booking-architecture.js`, other regex-heavy checks, `validation-core.js`.

**Goal:** One **declarative** place for “booking architecture” and related repo laws; shared evaluator.

**Tasks**

1. Add `scripts/policies/` + `run-policies.mjs` reading a table: `{ id, files/globs, rule type, message }`.
2. Migrate **booking** checks first (highest churn); leave exotic checks until stable.
3. Add golden fixture tests: fake repo snippets → expected violation list.

**Dependency category:** In-process.

**Verify:** `npm run verify`; intentionally inject a forbidden pattern locally and confirm one clear error.

**Exit:** New laws are rows in a table, not new copy-paste scripts.

---

## Phase 6 — Browser façade for `TM` / booking

**Cluster:** `js/locations.js`, `js/booking-controller.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `check-booking-architecture.js`.

**Goal:** A **documented, minimal public surface** on `window` for locations + booking decisions; implementation can stay split internally.

**Tasks**

1. Add `docs/tm-public-api.md` listing supported methods/properties (or JSDoc + `tm-public-api.d.ts` for editors).
2. Introduce `window.TMFacade` (or narrow `TMBooking` + `TM`) as the **only** supported extension point for new features.
3. Add **Node/jsdom** or **Vitest** tests that load scripts in order and assert façade shape (no Playwright required for shape).
4. Re-point `check-booking-architecture` policies at exported names in the façade doc.

**Dependency category:** In-process + Roller as **true external** (mock in unit tests).

**Verify:** `npm run verify`; new unit test job in `package.json` if not already present (`npm run test:unit`).

**Exit:** “What can I call on `window`?” is answered in one file; integration tests still run in Playwright.

---

## Phase dependency chart

```text
Phase 1 (ticket options)
    → Phase 3 (contract fingerprint uses same option ids)
Phase 2 (routes) — can run parallel to Phase 1 after brief coordination on verify script ordering
Phase 4 (CSS) — independent;best after high-churn migration slows
Phase 5 (policies) — anytime; absorbs checks touched by Phases 1–2–6
Phase 6 (TM façade) — best after Phase 1; coordinate with Phase 5 for booking rules
```

**Suggested serial order for a small team:** **1 → 2 → 3 → 4**, with **5** started after **1** (migrate booking checks once options are stable), and **6** after **1 + 5** scaffolding exists.

---

## Success criteria (whole program)

- [x] No duplicate ticket-option mapping in TS/CJS/browser. *(canonical: `src/lib/ticket-options.ts` + checks)*
- [x] Route manifests derived from `routes.json` (or single compile output). *(`scripts/compile-route-artifacts.mjs`)*
- [x] Embed includes fingerprint; stale client data is observable (non-PII). *(`locationsFingerprint`, `site_contract_stale`)*
- [ ] Event-template CSS has no forked ticket-panel block; split files are bounded. *(duplicate block removed; **named partial split** optional — see Phase 9 summary)*
- [x] New architectural rules default to policy table + tests.
- [x] Published `TM`/booking surface documented and shape-tested. *(`docs/tm-public-api.md`, `TMFacade`, Vitest)*

**GSD:** Phase 9 roadmap + `.planning/phases/09-architecture-deepening-template-hygiene/09-PLAN-SUMMARY.md` track delivery status vs this list.

---

## References (repo)

- `src/lib/site-contract.ts`, `src/lib/define-page.ts`
- `src/data/routes.json`, `scripts/lib/route-artifacts.js`
- `scripts/verify-site-output.mjs`, `package.json` verify chain
- `js/locations.js`, `js/booking-controller.js`, `js/ticket-panel.js`
