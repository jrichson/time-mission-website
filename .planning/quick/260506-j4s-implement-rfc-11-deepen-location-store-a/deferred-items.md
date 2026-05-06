# Deferred Items — Quick Task 260506-j4s (RFC #11)

These pre-existing failures surfaced during `npm run verify` post-build but are
NOT caused by RFC #11 changes. Reproducible on baseline HEAD `b4c52e9` after
fresh `npm run build:astro`.

| # | Check | Symptom | Pre-existing on baseline `b4c52e9`? |
|---|-------|---------|--------------------------------------|
| 1 | `scripts/check-hreflang-cluster.js` | `dist/antwerp.html`, `dist/index.html`, `dist/locations.html` emit `<link rel="alternate" hreflang>` tags. Per locked decision D-02, different cities are not language alternates per Google docs — the hreflang cluster on these pages is forbidden. | ✓ Yes |

## Root cause

`src/components/SiteHead.astro:73-110` defines a `hreflangCluster` array and
emits `<link rel="alternate" hreflang>` for every entry whenever `showHreflang`
is true. The component has emitted hreflang since commit `2d75334` ("audit-wave6").
The validator was added later in `78ffcff` ("feat(10-04): add check-hreflang-cluster
validator"). Whether the check ever passed on a fresh build is unclear; STATE.md
claims `npm run verify:phase10` was green at the close of Phase 10, but the
in-repo `dist/` may have been generated with `showHreflang=false` for cluster
pages at that time.

## Verification

```bash
# On commit b4c52e9 (pre-RFC-11):
git checkout b4c52e9 -- src/ data/
npm run build:astro
node scripts/check-hreflang-cluster.js
# → same 3 errors. Confirmed pre-existing.
```

## Recommendation

Should be filed as a separate quick task. Likely fix: gate `showHreflang` in
`SiteHead.astro` to only true on routes that genuinely have language
alternates (none today — the cluster is monolingual English across cities, so
hreflang shouldn't be emitted at all).

## Booking + persistence smoke tests (RFC #11 in-scope) — ALL PASS

- ✅ ticket panel options hydrate from location data (TMBooking.mount syncCtaHref)
- ✅ open location `?book=1` navigates to https checkout (BOOK-04 race fix from RFC #10 still green)
- ✅ Mobile location selector P0-7a — tap link keeps overlay open + reveals info panel (regression-tested post nav.js refactor)
- ✅ Homepage hero H1 assertions match post-Astro accessible markup

58 of 60 enabled smoke tests pass; 2 skipped by design. RFC #11 introduces zero regressions.
