---
phase: 02
slug: route-registry-clean-url-contract
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-29
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node CommonJS validation scripts plus existing Playwright smoke tests |
| **Config file** | `package.json`, `playwright.config.js` |
| **Quick run command** | Use the scoped command from the task row; before Plan 09, avoid default `npm run check:routes` unless all referenced scopes are clean |
| **Full suite command** | Plan 09 only: `npm run check && npm run build:astro && npm run check:astro-dist && npm run check:routes -- --dist` |
| **Estimated runtime** | ~60-120 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's scoped route command, such as `npm run check:routes -- --registry` or `npm run check:routes -- --sources --scope=groups`.
- **After Wave 1:** Run `npm run check:routes -- --registry`.
- **After Wave 2:** Run completed-scope static checks for redirects, sitemap, root-core, locations HTML, groups, and root-legal scopes; do not run global `npm run check` yet.
- **After Wave 3:** Run full source route validation with `npm run check:routes`; optionally run slow browser confidence with `npm run test:smoke`.
- **After Wave 4:** Run `npm run check && npm run build:astro && npm run check:astro-dist && npm run check:routes -- --dist`.
- **Before `/gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 120 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | ROUTE-01, ROUTE-02, ROUTE-04 | T-02-01 / T-02-02 | Registry rejects malformed routes, `.html` canonicals, trailing-slash canonicals, non-root `/index.html` output artifacts, duplicate sources, and redirect chains; `/locations` must declare `outputFile: "locations.html"` while `/locations/index.html` remains a legacy source. | static | `npm run check:routes -- --registry` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | ROUTE-03, ROUTE-04 | T-02-03 | Source URL surface checking modes exist; full source pass waits for later sweep plans. | static | `npm run check:routes -- --registry` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | ROUTE-02, ROUTE-03 | T-02-01 / T-02-02 | `_redirects` and sitemap entries use internal clean canonical targets unless explicitly temporary. | static | `npm run check:sitemap && npm run check:routes -- --redirects --sitemap` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | ROUTE-01, ROUTE-03, ROUTE-04 | T-02-03 / T-02-04 | Core top-level URL metadata and hrefs use clean routes without UI changes. | static | `npm run check:routes -- --sources --scope=root-core` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | ROUTE-01, ROUTE-03, ROUTE-04 | T-02-03 / T-02-04 | Location page and locations index URL metadata and hrefs use clean routes. | static | `npm run check:routes -- --sources --scope=locations` | ❌ W0 | ⬜ pending |
| 02-05-01 | 05 | 2 | ROUTE-01, ROUTE-03, ROUTE-04 | T-02-03 / T-02-04 | Group page URL metadata and hrefs use clean routes. | static | `npm run check:routes -- --sources --scope=groups` | ❌ W0 | ⬜ pending |
| 02-06-01 | 06 | 2 | ROUTE-01, ROUTE-03, ROUTE-04 | T-02-03 / T-02-04 | Legal and utility URL metadata and hrefs use clean routes. | static | `npm run check:routes -- --sources --scope=root-legal` | ❌ W0 | ⬜ pending |
| 02-07-01 | 07 | 3 | ROUTE-03, ROUTE-04 | T-02-03 | Location data first-party URL values use clean paths while business facts remain unchanged. | static | `npm run check:locations && npm run check:routes -- --sources --scope=locations` | ❌ W0 | ⬜ pending |
| 02-08-01 | 08 | 3 | ROUTE-01, ROUTE-03, ROUTE-04 | T-02-02 / T-02-03 | Runtime helpers emit clean paths and tests expect clean generated routes. | static | `npm run check:routes -- --sources --scope=shared` | ❌ W0 | ⬜ pending |
| 02-09-01 | 09 | 4 | ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04 | T-02-02 / T-02-03 | Built output checks prove registered routes exist and public URL surfaces agree after Astro build, including `/locations` via `dist/locations.html` under Astro `build.format: 'file'` and `trailingSlash: 'never'`. | built-output | `npm run verify:phase2` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/data/routes.json` — route registry covering public canonicals, legacy `.html` sources, aliases, redirect status, sitemap participation, file-style `outputFile` artifacts, and temporary `.html` target allowances. The `/locations` route must use `outputFile: "locations.html"`, keep `/locations/index.html` in `legacySources`, and keep `/locations/` as an alias to `/locations`.
- [ ] `scripts/check-route-contract.js` — route contract validator with `--sources`, `--redirects`, and `--dist` modes or equivalent flags.
- [ ] `package.json` — Plan 01 adds standalone `check:routes`; Plan 09 wires it into global `check` and adds `verify:phase2` after source scopes are clean.
- [ ] `docs/redirect-behavior.md` or `docs/redirect-map.md` — redirect behavior note covering query strings, fragments, status codes, and Cloudflare/Netlify differences.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cloudflare preview redirect behavior | ROUTE-02 | Local Python server does not apply `_redirects`; exact host behavior must be confirmed later. | On a Cloudflare preview in Phase 8, request representative `.html` and shortcut URLs and confirm one-hop clean destinations. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all MISSING references.
- [x] No watch-mode flags.
- [x] Feedback latency < 120s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-04-29
