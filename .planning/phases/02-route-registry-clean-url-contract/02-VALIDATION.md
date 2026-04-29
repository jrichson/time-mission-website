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
| **Quick run command** | `npm run check:routes` |
| **Full suite command** | `npm run check && npm run build:astro && npm run check:astro-dist && npm run check:routes -- --dist` |
| **Estimated runtime** | ~60-120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check:routes` once the script exists.
- **After every plan wave:** Run `npm run check && npm run build:astro && npm run check:astro-dist && npm run check:routes -- --dist`.
- **Before `/gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 120 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | ROUTE-01, ROUTE-02, ROUTE-04 | T-02-01 / T-02-02 | Registry rejects malformed routes, `.html` canonicals, trailing-slash canonicals, duplicate sources, and redirect chains. | static | `npm run check:routes` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | ROUTE-03, ROUTE-04 | T-02-03 | Source URL surfaces are checked against the clean route registry. | static | `npm run check:routes` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | ROUTE-02, ROUTE-03 | T-02-01 / T-02-02 | `_redirects` and sitemap entries use internal clean canonical targets unless explicitly temporary. | static | `npm run check:routes` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04 | T-02-02 / T-02-03 | Built output checks prove registered routes exist and public URL surfaces agree after Astro build. | built-output | `npm run build:astro && npm run check:astro-dist && npm run check:routes -- --dist` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/data/routes.json` — route registry covering public canonicals, legacy `.html` sources, aliases, redirect status, sitemap participation, and temporary `.html` target allowances.
- [ ] `scripts/check-route-contract.js` — route contract validator with `--sources`, `--redirects`, and `--dist` modes or equivalent flags.
- [ ] `package.json` — `check:routes` script wired into `check` without weakening existing checks.
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
