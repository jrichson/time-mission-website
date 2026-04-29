# Phase 2: Route Registry & Clean URL Contract - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md`.

**Date:** 2026-04-29
**Phase:** 2 — Route Registry & Clean URL Contract
**Areas discussed:** Registry & redirect generation; Marketing & slug shortcuts; Internal links & sitemap timing; Redirect fidelity (query/hash/status)

---

## Registry & redirect generation

| Option | Description | Selected |
|--------|-------------|----------|
| Single TS/JSON registry generates `_redirects` | Machine-readable SOT; scripts generate/validate | |
| Astro `src/pages` primary | Build output drives truth; registry only legacy pairs | |
| Hybrid + allowlist | Explicit contract + rare hand rules | |
| Claude/planner discretion | Optimize for maintainability and ROUTE-04 | ✓ |

**User's choice:** Claude/planner discretion (with constraints in CONTEXT: machine-readable SOT, generate/validate redirects, drift must fail builds).

**Notes:** Prior work locked `astro.config.mjs` output shape in Phase 1.

---

## Marketing & slug shortcuts

| Option | Description | Selected |
|--------|-------------|----------|
| Aliases on canonical routes | Same registry, alias keys | |
| Separate merged section/file | Still validated | |
| Manual `_redirects` for shortcuts in Phase 2 | Automate `.html`→clean only for pages | |
| Claude discretion | Simplest path meeting ROUTE-02/04 | ✓ |

**User's choice:** Claude/planner discretion (shortcuts must be covered by drift checks; targets migrate toward clean paths).

---

## Internal links & sitemap timing

| Option | Description | Selected |
|--------|-------------|----------|
| Enforce `dist/` first | Fix sources gradually | |
| Update links in touched files only | Incremental | |
| Full-repo sweep within Phase 2 | Source uses clean URLs broadly | ✓ |
| Claude discretion | Balance ROUTE-03 vs churn | |

**User's choice:** Full-repo sweep of internal hrefs to clean URLs in Phase 2 scope.

---

## Redirect fidelity (query, hash, status)

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve queries; keep current 302 where 302 | Document + test | |
| Preserve queries; normalize 301 where safe | | |
| Minimal — avoid loops wrong targets | Host-dependent doc | |
| Claude discretion — document Cloudflare behavior | ✓ |

**User's choice:** Claude/planner discretion with mandatory short behavior note for query, fragment, and status policy.

---

## Claude's Discretion

- Registry file layout, generate vs validate-only for `_redirects`, integration with `check-internal-links`.

## Deferred Ideas

- None surfaced during discussion (scope held to ROUTE domain).
