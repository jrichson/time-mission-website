import type { LandingHeadInput } from '../seo/catalog';

export interface PayloadSitePageContractDoc {
    path?: string | null;
    seo?: {
        metaTitle?: string | null;
        metaDescription?: string | null;
        robots?: string | null;
        ogImage?: string | null;
        twitterImage?: string | null;
    };
}

export function sitePagePathIsValid(path: string): boolean {
    if (path === '/') return true;
    if (path.startsWith('/c/')) return false;
    return /^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(path);
}

export function sitePageDocLooksRenderable(doc: PayloadSitePageContractDoc): boolean {
    if (!doc.path || !sitePagePathIsValid(doc.path)) return false;
    const s = doc.seo;
    if (!s?.metaTitle || !s.metaDescription || !s.ogImage) return false;
    return true;
}

export function sitePageHeadForDoc(doc: PayloadSitePageContractDoc | null | undefined): LandingHeadInput | null {
    if (!doc || !sitePageDocLooksRenderable(doc)) return null;

    const s = doc.seo!;
    return {
        metaTitle: s.metaTitle!,
        metaDescription: s.metaDescription!,
        robots: s.robots && s.robots.length ? s.robots : 'index,follow',
        ogImage: s.ogImage!,
        twitterImage: s.twitterImage,
    };
}
