# Plan 06-02 — Summary

**Done:** `js/analytics.js` with `TM_ANALYTICS_LABELS_EMBED` (must match `src/data/site/analytics-labels.json`), `TMAnalytics.track` + `safeDestination`, delegated nav/groups/gift/mission/experience-card tracking. `scripts/check-analytics-contract.js`, `npm run check:analytics`, wired into `npm run check`. `sync-static-to-public.mjs` copies labels to `public/data/analytics-labels.json` and repo `data/analytics-labels.json`.
