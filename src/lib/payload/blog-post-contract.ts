import { allLocations } from '../../data/locations';
import type { LandingHeadInput } from '../seo/catalog';

const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_BLOG_HERO_IMAGE = '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg';
const locationSlugs = new Set(allLocations.map((loc) => loc.slug).filter(Boolean));

export interface PayloadBlogPostDoc {
    id: string | number;
    title?: string | null;
    slug?: string | null;
    excerpt?: string | null;
    body?: string | null;
    publishDate?: string | null;
    locationSlug?: string | null;
    heroImage?: string | null;
    published?: boolean | null;
    includeInSitemap?: boolean | null;
    seo?: {
        metaTitle?: string | null;
        metaDescription?: string | null;
        robots?: string | null;
        ogImage?: string | null;
        twitterImage?: string | null;
    } | null;
}

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function publicAssetPath(value: unknown): string {
    const raw = cleanString(value);
    if (
        raw.startsWith('/assets/')
        && raw.length <= 512
        && !raw.includes('://')
        && !raw.includes('..')
        && !/[<>"'\\\s]/.test(raw)
    ) {
        return raw;
    }
    return '';
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function slugIsValidForBlogPost(slug: string): boolean {
    const cleaned = cleanString(slug);
    return BLOG_SLUG_PATTERN.test(cleaned) && !locationSlugs.has(cleaned);
}

export function blogLocationCanonicalPath(locationSlug: string): string {
    return `/blog/${cleanString(locationSlug)}`;
}

export function blogPostCanonicalPath(slug: string): string {
    return `/blog/${cleanString(slug)}`;
}

export function blogPostLocationSlug(doc: PayloadBlogPostDoc): string {
    const slug = cleanString(doc.locationSlug);
    return locationSlugs.has(slug) ? slug : '';
}

export function blogPostHeroImage(doc: PayloadBlogPostDoc): string {
    return publicAssetPath(doc.heroImage) || DEFAULT_BLOG_HERO_IMAGE;
}

function blogPostSocialImage(doc: PayloadBlogPostDoc): string {
    return publicAssetPath(doc.seo?.ogImage) || blogPostHeroImage(doc);
}

export function blogPostExcerptForDoc(doc: PayloadBlogPostDoc): string {
    return cleanString(doc.excerpt);
}

export function blogPostPublishDate(doc: PayloadBlogPostDoc): string {
    const raw = cleanString(doc.publishDate);
    const date = raw ? new Date(raw) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

export function blogPostDateLabel(doc: PayloadBlogPostDoc): string {
    const date = blogPostPublishDate(doc);
    if (!date) return '';
    return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
        year: 'numeric',
    });
}

export function blogPostBodyHtml(doc: PayloadBlogPostDoc): string {
    return cleanString(doc.body)
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('\n');
}

export function blogPostDocLooksRenderable(doc: PayloadBlogPostDoc): boolean {
    if (!doc || doc.published !== true) return false;
    if (!cleanString(doc.title) || !slugIsValidForBlogPost(cleanString(doc.slug))) return false;
    if (!blogPostLocationSlug(doc)) return false;
    if (!blogPostPublishDate(doc)) return false;
    if (!blogPostExcerptForDoc(doc) || !cleanString(doc.body)) return false;
    return true;
}

export function blogPostShouldAppearInSitemap(doc: PayloadBlogPostDoc): boolean {
    return blogPostDocLooksRenderable(doc) && doc.includeInSitemap !== false;
}

export function blogPostHeadForDoc(doc: PayloadBlogPostDoc): LandingHeadInput | null {
    if (!blogPostDocLooksRenderable(doc)) return null;

    return {
        metaTitle: cleanString(doc.seo?.metaTitle) || cleanString(doc.title),
        metaDescription: cleanString(doc.seo?.metaDescription) || blogPostExcerptForDoc(doc),
        robots: cleanString(doc.seo?.robots) || 'index,follow',
        ogImage: blogPostSocialImage(doc),
        twitterImage: publicAssetPath(doc.seo?.twitterImage) || blogPostSocialImage(doc),
    };
}

export function sortBlogPosts(posts: PayloadBlogPostDoc[]): PayloadBlogPostDoc[] {
    return [...posts].sort((a, b) => blogPostPublishDate(b).localeCompare(blogPostPublishDate(a)));
}
