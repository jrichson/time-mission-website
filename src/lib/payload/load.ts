/** Build-time Payload REST client for CMS landings (`cms/` workspace). */

import type { PayloadAnnouncementBannerDoc } from './announcement-banner-contract';
import {
    blogPostIsAvailableForProfile,
    type PayloadBlogPostDoc,
} from './blog-post-contract';
import {
    cmsBuildStrict,
    validatedCmsOriginBase,
} from './cms-origin';
import type { PayloadLandingSurface } from './landing-contract';
import type { PayloadLandingSourceChannel } from './landing-contract';
import type { PayloadLocationDetailsDoc } from './location-details-contract';
import { fetchPayloadCollection } from './read-adapter';
import { mergePressReleaseFallbackPosts } from '../../data/site/press-release-posts';
export {
    announcementBannerDocLooksUsable,
    announcementBannerViewForDoc,
    selectAnnouncementBanner,
} from './announcement-banner-contract';
export {
    blogLocationCanonicalPath,
    blogPostBodyHtml,
    blogPostCanonicalPath,
    blogPostDateLabel,
    blogPostDocLooksRenderable,
    blogPostExcerptForDoc,
    blogPostExcerptHtmlForDoc,
    blogPostExternalPublisher,
    blogPostExternalUrl,
    blogPostHeadForDoc,
    blogPostHeroImage,
    blogPostIsExternal,
    blogPostIsPressCoverage,
    blogPostIsAvailableForProfile,
    blogPostLocationSlug,
    blogPostPublishDate,
    blogPostPublishDateTime,
    blogPostShouldAppearInSitemap,
    blogPostShouldHaveDetailPage,
    blogPostShowsInPressRoom,
    slugIsValidForBlogPost,
    sortBlogPosts,
} from './blog-post-contract';
export {
    DEFAULT_LANDING_TEMPLATE,
    LANDING_TEMPLATE_OPTIONS,
    landingArchetypeForDoc,
    landingCanonicalPath,
    landingCtaForDoc,
    landingDistOutputCandidates,
    landingDocLooksRenderable,
    landingHeadForDoc,
    landingLaunchStateForDoc,
    landingReviewWarningsForDoc,
    landingShouldAppearInSitemap,
    landingTemplateForDoc,
    landingTemplateLabel,
    slugIsValidForLanding,
} from './landing-contract';
export {
    applyLocationDetailsOverrides,
    locationDetailsDocLooksUsable,
} from './location-details-contract';
export {
    sitePageDocLooksRenderable,
    sitePageHeadForDoc,
    sitePagePathIsValid,
} from './site-page-contract';
export type { PayloadLandingSurface } from './landing-contract';
export type { PayloadLandingArchetype } from './landing-contract';
export type { PayloadLandingLaunchState } from './landing-contract';
export type { PayloadLandingSourceChannel } from './landing-contract';
export type { PayloadLandingTemplate } from './landing-contract';
export type { PayloadAnnouncementBannerDoc } from './announcement-banner-contract';
export type { PayloadBlogPostDoc } from './blog-post-contract';
export type { PayloadLocationDetailsDoc } from './location-details-contract';

const DEFAULT_ORIGIN_KEYS = ['PAYLOAD_CMS_ORIGIN', 'PAYLOAD_PUBLIC_CMS_ORIGIN'] as const;
const STRICT_CMS_ORIGIN_ERROR =
    'PAYLOAD_CMS_BUILD_STRICT is set but PAYLOAD_CMS_ORIGIN is missing, invalid, or not allowed by PAYLOAD_CMS_ALLOWED_HOSTS.';

interface CmsReadOrigin {
    base: string;
    strict: boolean;
}

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

function publishedCmsOrigin({
    label,
    optional = false,
    origin,
}: {
    label: string;
    optional?: boolean;
    origin?: string;
}): CmsReadOrigin | null {
    const strict = optional ? false : cmsBuildStrict();
    const raw = (origin ?? cmsOrigin()).trim().replace(/\/+$/, '');
    const base = validatedCmsOriginBase(raw);
    if (base) return { base, strict };

    if (!optional && !strict && !raw) return null;
    if (!optional && strict) throw new Error(STRICT_CMS_ORIGIN_ERROR);

    if (raw) {
        console.warn(
            `[payload] skipping ${optional ? `optional ${label}` : label}: invalid or disallowed PAYLOAD_CMS_ORIGIN`,
        );
    }
    return null;
}

export interface PayloadLandingBulletsRow {
    text?: string | null;
}

export interface PayloadLandingDoc {
    id: string | number;
    slug: string;
    template?: string | null;
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
        launchState?: string | null;
        proofAngle?: string | null;
        ctaIntent?: string | null;
    };
    paidSocial?: {
        sourcePromise?: string | null;
        frictionReducer?: string | null;
    };
    localVenue?: {
        cityProof?: string | null;
        venueConfidence?: string | null;
        openingNote?: string | null;
    };
    groupEvent?: {
        plannerReassurance?: string | null;
        groupSize?: string | null;
        logisticsNote?: string | null;
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

/** Published landings visible to anonymous API (CMS access rule). */
export async function getPublishedLandings(origin?: string): Promise<PayloadLandingDoc[]> {
    const readOrigin = publishedCmsOrigin({ label: 'landings', origin });
    if (!readOrigin) return [];
    return fetchPayloadCollection<PayloadLandingDoc>({
        collection: 'landings',
        origin: readOrigin.base,
        strict: readOrigin.strict,
    });
}

/** Published existing-page metadata visible to anonymous API (CMS access rule). */
export async function getPublishedSitePages(origin?: string): Promise<PayloadSitePageDoc[]> {
    const readOrigin = publishedCmsOrigin({ label: 'site pages', origin });
    if (!readOrigin) return [];

    return fetchPayloadCollection<PayloadSitePageDoc>({
        collection: 'site-pages',
        origin: readOrigin.base,
        strict: readOrigin.strict,
    });
}

/**
 * Published announcement banners are optional during CMS rollout.
 * A missing collection, missing migration, or failed fetch must not break the public build.
 */
export async function getPublishedAnnouncementBanners(origin?: string): Promise<PayloadAnnouncementBannerDoc[]> {
    const readOrigin = publishedCmsOrigin({ label: 'announcement banners', optional: true, origin });
    if (!readOrigin) return [];

    return fetchPayloadCollection<PayloadAnnouncementBannerDoc>({
        collection: 'announcement-banners',
        optionalLabel: 'announcement banners',
        origin: readOrigin.base,
    });
}

/**
 * Published location details are optional during CMS rollout.
 * Missing CMS data must not block the public build; the code-owned location JSON remains the fallback.
 */
export async function getPublishedLocationDetails(origin?: string): Promise<PayloadLocationDetailsDoc[]> {
    const readOrigin = publishedCmsOrigin({ label: 'location details', optional: true, origin });
    if (!readOrigin) return [];

    return fetchPayloadCollection<PayloadLocationDetailsDoc>({
        collection: 'location-details',
        optionalLabel: 'location details',
        origin: readOrigin.base,
    });
}

/**
 * Published blog posts stay optional for loose local builds, but production
 * builds must fail when strict CMS mode is enabled and the collection cannot
 * be read. This prevents a temporary CMS outage from deploying an empty blog.
 */
export async function getPublishedBlogPosts(origin?: string): Promise<PayloadBlogPostDoc[]> {
    const readOrigin = publishedCmsOrigin({ label: 'blog posts', origin });
    if (!readOrigin) return mergePressReleaseFallbackPosts([]);

    const docs = await fetchPayloadCollection<PayloadBlogPostDoc>({
        collection: 'blog-posts',
        depth: 1,
        origin: readOrigin.base,
        strict: readOrigin.strict,
    });
    return mergePressReleaseFallbackPosts(
        docs.filter((doc) => blogPostIsAvailableForProfile(doc)),
    );
}

export async function getPublishedSitePage(canonicalPath: string, origin?: string): Promise<PayloadSitePageDoc | null> {
    const docs = await getPublishedSitePages(origin);
    return docs.find((doc) => doc.path === canonicalPath) ?? null;
}
