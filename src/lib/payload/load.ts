/** Build-time Payload REST client for CMS landings (`cms/` workspace). */

import {
    cmsBuildStrict,
    PAYLOAD_FETCH_TIMEOUT_MS,
    validatedCmsOriginBase,
} from './cms-origin';
import type { PayloadLandingSurface } from './landing-contract';
export {
    landingCanonicalPath,
    landingCtaForDoc,
    landingDistOutputCandidates,
    landingDocLooksRenderable,
    landingHeadForDoc,
    landingShouldAppearInSitemap,
    slugIsValidForLanding,
} from './landing-contract';
export {
    sitePageDocLooksRenderable,
    sitePageHeadForDoc,
    sitePagePathIsValid,
} from './site-page-contract';
export type { PayloadLandingSurface } from './landing-contract';

const DEFAULT_ORIGIN_KEYS = ['PAYLOAD_CMS_ORIGIN', 'PAYLOAD_PUBLIC_CMS_ORIGIN'] as const;

function cmsOrigin(): string {
    try {
        const v = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PAYLOAD_CMS_ORIGIN;
        const a = String(v ?? '').trim().replace(/\/+$/, '');
        if (a) return a;
    } catch {
        /* non-Vite runner */
    }
    for (const key of DEFAULT_ORIGIN_KEYS) {
        const raw = typeof process !== 'undefined' ? process.env[key] : undefined;
        const v = String(raw ?? '').trim().replace(/\/+$/, '');
        if (v) return v;
    }
    return '';
}

export interface PayloadLandingBulletsRow {
    text?: string | null;
}

export interface PayloadLandingDoc {
    id: string | number;
    slug: string;
    published?: boolean;
    includeInSitemap?: boolean;
    title: string;
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        robots?: string;
        canonicalOverride?: string | null;
        ogImage?: string;
        twitterImage?: string | null;
    };
    content?: {
        headline?: string;
        subheadline?: string;
        bullets?: PayloadLandingBulletsRow[] | null;
        primaryCtaLabel?: string;
        ctaSurface?: PayloadLandingSurface;
        ctaExternalUrl?: string | null;
    };
}

export interface PayloadSitePageDoc {
    id: string | number;
    title: string;
    path: string;
    published?: boolean;
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        robots?: string;
        ogImage?: string;
        twitterImage?: string | null;
    };
}

interface PayloadListResponse {
    docs?: unknown[];
}

async function fetchPayloadLandings(origin: string, strict: boolean): Promise<PayloadLandingDoc[]> {
    const url = new URL('/api/landings', `${origin}/`);
    url.searchParams.set('limit', '250');
    url.searchParams.set('depth', '0');
    url.searchParams.sort();
    try {
        const res = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(PAYLOAD_FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
            const msg = `[payload] GET ${url} failed: ${res.status}`;
            if (strict) throw new Error(msg);
            console.warn(msg);
            return [];
        }
        const body = (await res.json()) as PayloadListResponse;
        return Array.isArray(body.docs) ? (body.docs as PayloadLandingDoc[]) : [];
    } catch (err) {
        if (strict) throw err;
        console.warn('[payload] landings fetch failed:', err instanceof Error ? err.message : err);
        return [];
    }
}

let sitePagesCache: Promise<PayloadSitePageDoc[]> | null = null;

async function fetchPayloadSitePages(origin: string, strict: boolean): Promise<PayloadSitePageDoc[]> {
    const url = new URL('/api/site-pages', `${origin}/`);
    url.searchParams.set('limit', '250');
    url.searchParams.set('depth', '0');
    url.searchParams.sort();
    try {
        const res = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(PAYLOAD_FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
            const msg = `[payload] GET ${url} failed: ${res.status}`;
            if (strict) throw new Error(msg);
            console.warn(msg);
            return [];
        }
        const body = (await res.json()) as PayloadListResponse;
        return Array.isArray(body.docs) ? (body.docs as PayloadSitePageDoc[]) : [];
    } catch (err) {
        if (strict) throw err;
        console.warn('[payload] site pages fetch failed:', err instanceof Error ? err.message : err);
        return [];
    }
}

/** Published landings visible to anonymous API (CMS access rule). */
export async function getPublishedLandings(origin?: string): Promise<PayloadLandingDoc[]> {
    const strict = cmsBuildStrict();
    const raw = (origin ?? cmsOrigin()).trim().replace(/\/+$/, '');
    const base = validatedCmsOriginBase(raw);
    if (!base) {
        if (!strict && !raw) return [];
        if (strict) {
            throw new Error(
                'PAYLOAD_CMS_BUILD_STRICT is set but PAYLOAD_CMS_ORIGIN is missing, invalid, or not allowed by PAYLOAD_CMS_ALLOWED_HOSTS.',
            );
        }
        console.warn('[payload] skipping landings: invalid or disallowed PAYLOAD_CMS_ORIGIN');
        return [];
    }
    return fetchPayloadLandings(base, strict);
}

/** Published existing-page metadata visible to anonymous API (CMS access rule). */
export async function getPublishedSitePages(origin?: string): Promise<PayloadSitePageDoc[]> {
    const strict = cmsBuildStrict();
    const raw = (origin ?? cmsOrigin()).trim().replace(/\/+$/, '');
    const base = validatedCmsOriginBase(raw);
    if (!base) {
        if (!strict && !raw) return [];
        if (strict) {
            throw new Error(
                'PAYLOAD_CMS_BUILD_STRICT is set but PAYLOAD_CMS_ORIGIN is missing, invalid, or not allowed by PAYLOAD_CMS_ALLOWED_HOSTS.',
            );
        }
        console.warn('[payload] skipping site pages: invalid or disallowed PAYLOAD_CMS_ORIGIN');
        return [];
    }

    sitePagesCache = sitePagesCache ?? fetchPayloadSitePages(base, strict);
    return sitePagesCache;
}

export async function getPublishedSitePage(canonicalPath: string, origin?: string): Promise<PayloadSitePageDoc | null> {
    const docs = await getPublishedSitePages(origin);
    return docs.find((doc) => doc.path === canonicalPath) ?? null;
}
