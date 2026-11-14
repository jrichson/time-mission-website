# Unpublished pages

Page files kept for reuse but not built. Astro only builds files under `src/pages`.

## Manassas group pages (unpublished 2026-11-13)

`manassas/groups.astro` and `manassas/groups/*.astro` are the venue-specific group pages.
While they are here, `/manassas/groups` and `/manassas/groups/<type>` serve the shared group
pages, like every other venue. Their component (`src/components/LocalGroupPage.astro`), copy
(`src/data/site/local-group-pages.json`) and Spanish strings are still in place.

To publish them again:

1. Move the files back to `src/pages/manassas/`.
2. Restore their entries in `src/data/routes.json` and `src/data/site/seo-routes.json`, and
   the `.html` redirect lines in `_redirects` (see commit 883ffbb).
3. Run `npm run compile:routes`.
4. Add a CMS migration that sets `published = true` for the seven `/manassas/groups` paths.
