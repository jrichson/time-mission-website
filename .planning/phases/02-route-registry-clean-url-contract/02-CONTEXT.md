# Phase 2: Route Registry & Clean URL Contract - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers a single enforceable URL contract for the migrated Astro static site: every public page has one clean extensionless canonical path (no trailing slash), every legacy `.html` URL redirects directly to that canonical without loops, and site-wide references—redirect rules, internal links, sitemap entries, schema URLs, and analytics page context—are derived from or validated against one route registry so drift fails automated checks (ROUTE-01–04).

</domain>

<decisions>
## Implementation Decisions

### Route registry & redirect generation
- **D-01:** **Claude / planner discretion** for the exact registry format and file layout, with these constraints: there must be a **machine-readable** representation of (a) canonical clean paths and (b) legacy sources (at minimum every legacy `.html` path that must map to a canonical). It must be possible to **generate or validate** `_redirects` (and future sitemap/schema consumers) from this representation without hand-copying every row ad hoc.
- **D-02:** Validation (ROUTE-04) must fail if **built output**, **registry**, or **`_redirects`** disagree on a public URL mapping—planner defines the comparison surface (e.g. `dist/` HTML, link checker, redirect table).
- **D-03:** Astro remains configured with `build.format: 'file'` and `trailingSlash: 'never'` (Phase 1); Phase 2 **does not** change that shape—only enforces the contract end-to-end.

### Marketing & slug shortcuts
- **D-04:** **Claude / planner discretion** for whether shortcuts live as **aliases inside the same registry object** vs a **merged second list** concatenated into deploy `_redirects`—constraints: shortcuts must be **included in drift detection** (no untracked orphan rules that bypass checks), and **targets must eventually be clean canonical paths**, not `.html` files once those pages migrate.
- **D-05:** Until all pages emit clean URLs from Astro, intermediary targets may still point at `.html` **only if** tracked and scheduled for removal in a later phase; prefer moving shortcut targets to clean paths in Phase 2 when the destination exists.

### Internal links & sitemap
- **D-06:** Phase 2 includes a **full-repository sweep** of internal `href`/`src` references that should be first-party navigation (within scope defined by planners: typically `href` to same-site HTML paths) so **source-authored links use clean canonical paths**, not `.html` URLs—aligned with ROUTE-03.
- **D-07:** **Sitemap** (`sitemap.xml`): Phase 1 copied it unchanged; Phase 2 must either **update it to list only clean canonical URLs** or introduce **generated sitemap from registry/build**—planner chooses minimal path that satisfies ROUTE-03 (no `.html` in sitemap entries for migrated routes).

### Redirect fidelity (query, hash, status)
- **D-08:** **Claude / planner discretion** on implementation specifics; **documentation requirement**: Phase 2 deliverables include a short **redirect behavior note** covering (1) whether query strings are preserved when legacy URLs redirect to clean paths on the static host, (2) that URL **fragments (`#...`)** are not sent to the server and what that means for rules like `groups.html#birthday`, and (3) **HTTP status** policy (e.g. keep **302** for intentionally temporary routes vs **301** for permanent moves) when targets move from `.html` to clean paths.
- **D-09:** Do not introduce **redirect chains** that harm SEO or analytics: legacy → clean should be **one hop** where the platform allows (per ROUTE-02).

### Claude's Discretion
- Exact schema for the route registry file(s), choice of `generate` vs `validate-only` for `_redirects`, and how to integrate with existing `scripts/check-internal-links.js` and future checks.
- Whether to add a small **allowlist** for edge-case redirects that cannot be expressed in the registry yet—if used, it must be explicit and reviewed.
- Cloudflare-specific subtleties after reading current `docs/redirect-map.md` and host docs.

### Folded Todos
- None (no matching backlog todos for Phase 2).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, ROUTE requirements.
- `.planning/REQUIREMENTS.md` — ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04.
- `.planning/PROJECT.md` — Canonical URL policy, `.html` redirect policy, hosting assumptions.

### Prior phase & pitfalls
- `.planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md` — Locked Astro output shape (`build.format`, `trailingSlash`), Phase 1 scope boundary.
- `.planning/research/PITFALLS.md` — **Pitfall 1** (clean URLs vs Astro, Cloudflare, legacy `.html` redirects).

### Live contracts in repo
- `astro.config.mjs` — `site`, `output: 'static'`, `trailingSlash: 'never'`, `build.format: 'file'`.
- `_redirects` — Current Netlify/Cloudflare redirect table (many targets still `.html`).
- `docs/redirect-map.md` — Redirect reasoning and alternate host formats.
- `scripts/check-internal-links.js` — Existing internal link validation to extend or align with clean URLs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `_redirects` — Must evolve from `.html` targets toward clean paths while preserving SEO shortcuts.
- `scripts/check-internal-links.js` — Collects failures across HTML pages; likely integration point or pattern for ROUTE-04 checks.
- `docs/redirect-map.md` — Documents redirect intent for operators and alternate platforms.

### Established patterns
- Static hosting expects `_redirects` and `_headers` at publish root; Astro copies `public/` verbatim—registry output should land where deploy expects it.
- Phase 1 already runs `npm run verify` unchanged; Phase 2 should extend `check` or add sibling scripts rather than weakening the gate.

### Integration points
- Future Phase 3+ data modules and Phase 7 sitemap/schema generation **must consume the same canonical paths** defined here—avoid one-off slug strings in Phase 2.

</code_context>

<specifics>
## Specific Ideas

- User opted for **full-repo internal link sweep** to clean URLs in Phase 2 (not “dist-only first”).
- Registry, shortcuts merge strategy, and redirect fidelity mechanics were left to **planner discretion** with explicit documentation and drift-check requirements above.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 3+:** Location and business data modules may add derived path helpers; Phase 2 should not duplicate location business logic—only URL/routing contract.
- **Phase 4+:** Component-level nav/footer may refactor again; internal link sweep in Phase 2 should use patterns that components can keep (`import` from route helpers later).

### Reviewed Todos (not folded)
- None.

</deferred>

---

*Phase: 02-route-registry-clean-url-contract*
*Context gathered: 2026-04-29*
