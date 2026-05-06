/**
 * RFC #9 lightweight page guard — Astro frontmatter declares durable route identity inline.
 * Pairs conceptually with `src/data/routes.json`; validates shape only (no runtime merge).
 */

export interface SitePageMeta {
    /** Must match Phase 2 clean URL (e.g. `/about`). */
    canonicalPath: string;
    /** Optional explicit last-updated override (YYYY-MM-DD). Validated at usage in resolveLastUpdated(). */
    lastUpdated?: string;
}

export function definePage<const T extends SitePageMeta>(page: T): T {
    if (typeof page.canonicalPath !== 'string' || !page.canonicalPath.startsWith('/')) {
        throw new Error(`definePage: canonicalPath must start with / (got ${String(page.canonicalPath)})`);
    }
    return page;
}
