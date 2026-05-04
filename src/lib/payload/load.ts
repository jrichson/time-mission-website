/** Build-time Payload REST client for CMS landings (`cms/` workspace). */

import {
    cmsBuildStrict,
    PAYLOAD_FETCH_TIMEOUT_MS,
    validatedCmsOriginBase,
} from './cms-origin';

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

export type PayloadLandingSurface =
    | 'book_panel'
    | 'missions'
    | 'groups'
    | 'contact'
    | 'gift_cards'
    | 'external';

interface PayloadListResponse {
    docs?: PayloadLandingDoc[];
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
        return Array.isArray(body.docs) ? body.docs : [];
    } catch (err) {
        if (strict) throw err;
        console.warn('[payload] landings fetch failed:', err instanceof Error ? err.message : err);
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

export function landingCanonicalPath(slug: string, prefix = '/c'): string {
    const p = prefix.startsWith('/') ? prefix : `/${prefix}`;
    return `${p}/${slug}`;
}

export function slugIsValidForLanding(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Minimum fields needed for Astro `c/[slug]` prerender — keep in sync with page template guards */
export function landingDocLooksRenderable(doc: PayloadLandingDoc): boolean {
    if (!doc.slug || !slugIsValidForLanding(doc.slug)) return false;
    const s = doc.seo;
    if (!s?.metaTitle || !s.metaDescription || !s.ogImage) return false;
    if (!doc.content?.headline || !doc.content?.primaryCtaLabel) return false;
    return true;
}
