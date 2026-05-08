import path from 'node:path';
import type { LandingHeadInput } from '../seo/catalog';

export type PayloadLandingSurface =
    | 'book_panel'
    | 'missions'
    | 'groups'
    | 'contact'
    | 'gift_cards'
    | 'external';

export interface PayloadLandingContractDoc {
    slug?: string | null;
    includeInSitemap?: boolean;
    seo?: {
        metaTitle?: string | null;
        metaDescription?: string | null;
        robots?: string | null;
        canonicalOverride?: string | null;
        ogImage?: string | null;
        twitterImage?: string | null;
    };
    content?: {
        headline?: string | null;
        primaryCtaLabel?: string | null;
        ctaSurface?: PayloadLandingSurface | null;
        ctaExternalUrl?: string | null;
    };
}

export interface LandingCtaModel {
    surface: PayloadLandingSurface;
    primaryHref: string;
    bookTrigger: boolean;
    linkPath: string;
}

export function landingCanonicalPath(slug: string, prefix = '/c'): string {
    const p = prefix.startsWith('/') ? prefix : `/${prefix}`;
    return `${p}/${slug}`;
}

export function slugIsValidForLanding(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Minimum fields needed for Astro `c/[slug]` prerender — keep in sync with page template guards. */
export function landingDocLooksRenderable(doc: PayloadLandingContractDoc): boolean {
    if (!doc.slug || !slugIsValidForLanding(doc.slug)) return false;
    const s = doc.seo;
    if (!s?.metaTitle || !s.metaDescription || !s.ogImage) return false;
    if (!doc.content?.headline || !doc.content?.primaryCtaLabel) return false;
    return true;
}

export function landingHeadForDoc(doc: PayloadLandingContractDoc): LandingHeadInput | null {
    const s = doc.seo;
    if (!s?.metaTitle || !s.metaDescription || !s.ogImage) return null;
    return {
        metaTitle: s.metaTitle,
        metaDescription: s.metaDescription,
        robots: s.robots && s.robots.length ? s.robots : 'index,follow',
        canonicalOverride: s.canonicalOverride,
        ogImage: s.ogImage,
        twitterImage: s.twitterImage,
    };
}

export function landingShouldAppearInSitemap(doc: PayloadLandingContractDoc): boolean {
    if (!landingDocLooksRenderable(doc)) return false;
    if (doc.includeInSitemap === false) return false;
    if (doc.seo?.robots === 'noindex,follow') return false;
    return true;
}

export function landingCtaForDoc(doc: PayloadLandingContractDoc): LandingCtaModel {
    const content = doc.content || {};
    const surface = (content.ctaSurface || 'book_panel') as PayloadLandingSurface;

    if (surface === 'book_panel') {
        return {
            surface,
            primaryHref: '#tickets',
            bookTrigger: true,
            linkPath: '/tickets',
        };
    }

    const internalHrefs: Record<Exclude<PayloadLandingSurface, 'book_panel' | 'external'>, string> = {
        missions: '/missions',
        groups: '/groups',
        contact: '/contact',
        gift_cards: '/gift-cards',
    };

    if (surface !== 'external') {
        const href = internalHrefs[surface] || '/missions';
        return {
            surface,
            primaryHref: href,
            bookTrigger: false,
            linkPath: href,
        };
    }

    const primaryHref = content.ctaExternalUrl || '/missions';
    let linkPath = '/';
    try {
        linkPath = new URL(primaryHref).pathname || '/';
    } catch {
        linkPath = '/';
    }
    return {
        surface,
        primaryHref,
        bookTrigger: false,
        linkPath,
    };
}

export function landingDistOutputCandidates(root: string, prefix: string, slug: string): string[] {
    const cleanPrefix = prefix.startsWith('/') ? prefix.slice(1) : prefix;
    return [
        path.join(root, 'dist', cleanPrefix, `${slug}.html`),
        path.join(root, 'dist', cleanPrefix, slug, 'index.html'),
    ];
}
