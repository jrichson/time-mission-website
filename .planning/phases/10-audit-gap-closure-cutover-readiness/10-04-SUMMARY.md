---
phase: 10
plan: 04
status: complete
completed: 2026-05-04
addresses: [P1-9]
requirements_addressed: [DATA-04, SEO-04]
executed_by: orchestrator (inline) — initial subagent dispatch failed with bash permission denials before creating its worktree
---

## What Was Built

Closes audit P1-9. SiteLayout now accepts an optional `lang` prop (default `'en'`) that flows into `<html lang>`, Antwerp ships as Astro with `<html lang="nl-BE">`, and a new validator enforces the locked D-02 decision: per-route `<html lang>` must match `data/locations.json`'s `hreflang` field, and zero pages may emit a cross-city `<link rel="alternate" hreflang>` tag.

## SiteLayout Props Delta

```diff
 interface Props {
   canonicalPath: string;
   ...
   landingHead?: import('../lib/seo/catalog').LandingHeadInput | null;
+  lang?: string;
 }
 const { ..., lang = 'en' } = Astro.props;
-<html lang="en">
+<html lang={lang}>
```

Default `'en'` preserves behavior for the 21 existing routes that don't pass `lang`.

## Antwerp Migration Artifacts

| Artifact | Lines | Source |
|----------|-------|--------|
| `src/partials/antwerp-inline.raw.css.txt` | 2,807 | Lines 34-2840 of `antwerp.html` |
| `src/partials/antwerp-main.frag.txt` | 485 | Lines 3038-3522 (hero through last content section, footer-comment trimmed) |
| `src/partials/antwerp-after.frag.txt` | 568 | Lines 3679-4246 (typewriter / animation / game-popup scripts) |
| `src/pages/antwerp.astro` | 44 | Mirrors `philadelphia.astro`; passes `lang="nl-BE"` |
| `src/data/site/astro-rendered-output-files.json` | regenerated 21 → 22 | `npm run compile:routes` |

Schema continuity: `dist/antwerp.html` retains `"name":"Time Mission Antwerp"` and `"alternateName":"Experience Factory Antwerp"` via `buildLocationGraph('antwerp', ...)` + `serializeGraph`. Skip-link, `<header role="banner">`, `<main id="main">`, `<footer role="contentinfo">` from plan 10-01 propagate through `SiteLayout`.

Legacy `antwerp.html` is **not deleted** — kept at the repo root for rollback safety; `sync-static-to-public.mjs` skips it now that the manifest claims it.

## hreflang Field Values

| Slug | Status | hreflang | Note |
|------|--------|----------|------|
| antwerp | open | `"nl-BE"` | Drives `<html lang="nl-BE">` on Antwerp |
| brussels | coming-soon | `"fr-BE"` | Stored for future page; not consumed yet |
| All US locations | open / coming-soon | `null` | Default `'en'` applies |

## Validator Contract Update (locked D-02)

`scripts/check-location-contracts.js` had a stale array-shape rule for `hreflang` (the rejected pre-D-02 design where it was a URL cluster). Updated to enforce the locked D-02 contract:

```javascript
// hreflang is LANG ATTRIBUTE ONLY (BCP-47 string per location)
if (location.hreflang == null) return;
if (typeof location.hreflang !== 'string') errors.push(...);
if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(location.hreflang)) errors.push(...);
```

This is a deliberate contract update, not a regression — the prior shape was leftover from a design Google docs do not endorse.

## check-hreflang-cluster.js — Validator Behavior

- Reads `data/locations.json` and the Astro manifest.
- For every file in `outputFiles`:
  - Builds expected `<html lang>` from the location's `hreflang` field (else `'en'`).
  - Asserts the dist HTML matches.
  - Asserts the file does NOT emit `<link rel="alternate" hreflang=`.
- CommonJS, error-collection pattern, `process.exit(1)` on failure (matches `scripts/check-*.js` conventions per CLAUDE.md).

Wired into `scripts/verify-site-output.mjs` between `check:img-alt-axe` and `check:sitemap-output`, and added to `package.json` as `npm run check:hreflang-cluster`.

## Negative-Case Validator Test Result

| Mutation | Result |
|----------|--------|
| Inject `<link rel="alternate" hreflang="nl-BE" href="/antwerp">` into `dist/index.html` | FAILED (correctly): `index.html: emits <link rel="alternate" hreflang> tag (forbidden per locked decision D-02 — ...)` |
| Replace `<html lang="nl-BE">` with `<html lang="en">` on `dist/antwerp.html` | FAILED (correctly): `antwerp.html: expected <html lang="nl-BE"> but found lang="en"` |
| Restore original dist | PASSED: `check-hreflang-cluster passed: 22 files validated, 0 cross-cluster hreflang violations.` |

## Key Files Created / Modified

- `src/layouts/SiteLayout.astro` — modified (lang prop)
- `src/pages/antwerp.astro` — created
- `src/partials/antwerp-inline.raw.css.txt` — created
- `src/partials/antwerp-main.frag.txt` — created
- `src/partials/antwerp-after.frag.txt` — created
- `data/locations.json` — modified (antwerp.hreflang, brussels.hreflang)
- `src/data/site/astro-rendered-output-files.json` — regenerated
- `scripts/check-location-contracts.js` — modified (BCP-47 string contract)
- `scripts/check-hreflang-cluster.js` — created
- `package.json` — modified (new check script)
- `scripts/verify-site-output.mjs` — modified (added step)

## Commits

- `66e4edd` — feat(10-04): add lang?: string prop to SiteLayout + parameterize <html lang>
- `8691091` — feat(10-04): migrate antwerp.html to src/pages/antwerp.astro with lang="nl-BE"
- `78ffcff` — feat(10-04): add check-hreflang-cluster validator + wire into verify chain

## Notes / Deviations

- **Inline execution**: The initially-spawned `gsd-executor` subagent failed at startup with repeated bash permission denials and aborted before creating its worktree. To unblock the wave, the orchestrator executed the plan inline on the main branch. All atomic-commit-per-task and verification-loop discipline preserved; only the worktree-isolation step was skipped.
- **Locations contract update** is recorded above and matches the locked D-02 wording. If the upstream `data/locations.json` schema docs (out-of-tree) still describe the array shape, they should be updated accordingly during phase verification or a follow-up doc pass.
- **GitNexus impact analysis**: did not run live during inline execution because the index was already stale (last indexed `38f54f0`, several commits behind). The pre-edit risk profile of `SiteLayout.astro` (HIGH; 22 routes consume it) was honored manually — only additive prop changes, default preserves behavior, no breaking signature changes. `npx gitnexus analyze` should run at phase close.
- An untracked `.claude/worktrees/` and `assets/video/hero-bg-web.mp4` exist in the working tree from prior agents/runtime; not part of this plan and not committed.
