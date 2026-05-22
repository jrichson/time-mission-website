import path from 'node:path';
import type { LandingHeadInput } from '../seo/catalog';

export type PayloadLandingSurface =
    | 'book_panel'
    | 'missions'
    | 'groups'
    | 'contact'
    | 'gift_cards'
    | 'external';

export type PayloadLandingArchetype =
    | 'paid_social_campaign'
    | 'local_venue_city'
    | 'group_event';

export type PayloadLandingCompatibilityTemplate =
    | 'campaign'
    | 'location_promo'
    | 'coming_soon';

export type PayloadLandingTemplate = PayloadLandingArchetype | PayloadLandingCompatibilityTemplate;

export type PayloadLandingLaunchState = 'open' | 'coming_soon';

export type PayloadLandingSourceChannel =
    | 'paid_ad'
    | 'organic_social'
    | 'email'
    | 'local_search'
    | 'partner'
    | 'internal'
    | 'other';

export const DEFAULT_LANDING_ARCHETYPE: PayloadLandingArchetype = 'paid_social_campaign';
export const DEFAULT_LANDING_TEMPLATE: PayloadLandingArchetype = DEFAULT_LANDING_ARCHETYPE;

export const LANDING_TEMPLATE_OPTIONS: Array<{
    value: PayloadLandingArchetype;
    label: string;
    source: string;
    summary: string;
}> = [
    {
        value: 'paid_social_campaign',
        label: 'Paid/Social Campaign',
        source: 'Ads, social posts, email, and seasonal offers',
        summary: 'Fast promise match, short proof, and one booking-first action.',
    },
    {
        value: 'group_event',
        label: 'Group Event',
        source: '/groups/birthdays and /groups/corporate',
        summary: 'Planner reassurance, logistics proof, and inquiry-first conversion.',
    },
    {
        value: 'local_venue_city',
        label: 'Local Venue/City',
        source: '/philadelphia, /mount-prospect, and /houston',
        summary: 'Venue-forward layout for local offers, openings, and city campaigns.',
    },
];

export interface PayloadLandingContractDoc {
    slug?: string | null;
    template?: PayloadLandingTemplate | string | null;
    includeInSitemap?: boolean | null;
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
        subheadline?: string | null;
        bullets?: Array<{ text?: string | null }> | null;
        primaryCtaLabel?: string | null;
        ctaSurface?: PayloadLandingSurface | null;
        ctaExternalUrl?: string | null;
    };
    brief?: {
        sourceChannel?: PayloadLandingSourceChannel | string | null;
        sourceName?: string | null;
        sourceUrl?: string | null;
        sourcePromise?: string | null;
        visitorIntent?: string | null;
        successMetric?: string | null;
    };
    strategy?: {
        audience?: string | null;
        campaignGoal?: string | null;
        offerType?: string | null;
        locationOrCity?: string | null;
        eventType?: string | null;
        launchState?: PayloadLandingLaunchState | string | null;
        proofAngle?: string | null;
        ctaIntent?: string | null;
    };
}

export interface LandingCtaModel {
    surface: PayloadLandingSurface;
    primaryHref: string;
    bookTrigger: boolean;
    linkPath: string;
}

const LANDING_URL_MAX_LENGTH = 2048;

export function landingCanonicalPath(slug: string, prefix = '/c'): string {
    const p = prefix.startsWith('/') ? prefix : `/${prefix}`;
    return `${p}/${slug}`;
}

export function slugIsValidForLanding(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function landingArchetypeForValue(value: PayloadLandingContractDoc['template']): PayloadLandingArchetype {
    if (value === 'group_event') return 'group_event';
    if (value === 'local_venue_city' || value === 'location_promo' || value === 'coming_soon') {
        return 'local_venue_city';
    }
    if (value === 'paid_social_campaign' || value === 'campaign') return 'paid_social_campaign';
    return DEFAULT_LANDING_ARCHETYPE;
}

function safeExternalLandingHref(value: string | null | undefined): string | null {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw || raw.length > LANDING_URL_MAX_LENGTH || /[<>"'\\\s]/.test(raw)) return null;

    try {
        const url = new URL(raw);
        if (url.protocol !== 'https:' || url.username || url.password) return null;
        return url.toString();
    } catch {
        return null;
    }
}

export function landingArchetypeForDoc(doc: PayloadLandingContractDoc): PayloadLandingArchetype {
    return landingArchetypeForValue(doc.template);
}

export function landingTemplateForDoc(doc: PayloadLandingContractDoc): PayloadLandingArchetype {
    return landingArchetypeForDoc(doc);
}

export function landingLaunchStateForDoc(doc: PayloadLandingContractDoc): PayloadLandingLaunchState {
    if (doc.template === 'coming_soon') return 'coming_soon';
    return doc.strategy?.launchState === 'coming_soon' ? 'coming_soon' : 'open';
}

export function landingTemplateLabel(template: PayloadLandingTemplate | string | null | undefined): string {
    const archetype = landingArchetypeForValue(template);
    return LANDING_TEMPLATE_OPTIONS.find((option) => option.value === archetype)?.label ?? 'Paid/Social Campaign';
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
    const surface = (content.ctaSurface || defaultCtaSurfaceForDoc(doc)) as PayloadLandingSurface;

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

    const primaryHref = safeExternalLandingHref(content.ctaExternalUrl);
    if (!primaryHref) {
        return {
            surface: 'missions',
            primaryHref: '/missions',
            bookTrigger: false,
            linkPath: '/missions',
        };
    }

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

function defaultCtaSurfaceForDoc(doc: PayloadLandingContractDoc): PayloadLandingSurface {
    if (landingArchetypeForDoc(doc) === 'group_event') return 'contact';
    if (landingLaunchStateForDoc(doc) === 'coming_soon') return 'contact';
    return 'book_panel';
}

export function landingReviewWarningsForDoc(doc: PayloadLandingContractDoc): string[] {
    const warnings: string[] = [];
    const bullets = doc.content?.bullets?.filter((bullet) => String(bullet?.text || '').trim()).length ?? 0;
    const sourcePromise = String(doc.brief?.sourcePromise || '').trim();
    const visitorIntent = String(doc.brief?.visitorIntent || '').trim();

    if (!sourcePromise) warnings.push('Add the source promise from the ad, post, email, search query, or campaign request.');
    if (!visitorIntent) warnings.push('Add the visitor intent so the page copy is tied to a real decision path.');
    if (!doc.content?.subheadline) warnings.push('Add a subheadline so visitors understand the offer before they choose.');
    if (bullets < 3) warnings.push('Add at least three concrete proof points.');
    if (doc.content?.ctaSurface === 'external' && !safeExternalLandingHref(doc.content.ctaExternalUrl)) {
        warnings.push('Add a credential-free https external CTA URL before publishing.');
    }
    if (landingLaunchStateForDoc(doc) === 'coming_soon' && doc.content?.ctaSurface === 'book_panel') {
        warnings.push('Coming-soon pages should use contact or updates language instead of immediate booking.');
    }

    return warnings;
}

export function landingDistOutputCandidates(root: string, prefix: string, slug: string): string[] {
    const cleanPrefix = prefix.startsWith('/') ? prefix.slice(1) : prefix;
    return [
        path.join(root, 'dist', cleanPrefix, `${slug}.html`),
        path.join(root, 'dist', cleanPrefix, slug, 'index.html'),
    ];
}
