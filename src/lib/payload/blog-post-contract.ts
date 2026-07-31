import { allLocations } from '../../data/locations';
import type { LandingHeadInput } from '../seo/catalog';

const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_BLOG_HERO_IMAGE = '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg';
const locationSlugs = new Set(allLocations.map((loc) => loc.slug).filter(Boolean));
const TEXT_FORMAT_BOLD = 1;
const TEXT_FORMAT_ITALIC = 2;
const TEXT_FORMAT_STRIKETHROUGH = 4;
const TEXT_FORMAT_UNDERLINE = 8;
const TEXT_FORMAT_CODE = 16;

type PayloadRichTextValue = string | PayloadLexicalEditorState | null | undefined;

interface PayloadLexicalEditorState {
    root?: PayloadLexicalNode | null;
}

interface PayloadLexicalNode {
    children?: PayloadLexicalNode[] | null;
    fields?: {
        caption?: string | null;
        newTab?: boolean | null;
        url?: string | null;
    } | null;
    format?: number | string | null;
    listType?: string | null;
    tag?: string | null;
    text?: string | null;
    type?: string | null;
    url?: string | null;
    relationTo?: string | null;
    value?: string | number | PayloadMediaDoc | null;
}

interface PayloadMediaDoc {
    alt?: string | null;
    caption?: string | null;
    filename?: string | null;
    height?: number | null;
    id?: string | number | null;
    mimeType?: string | null;
    url?: string | null;
    width?: number | null;
}

export interface PayloadBlogPostDoc {
    id: string | number;
    title?: string | null;
    slug?: string | null;
    excerpt?: PayloadRichTextValue;
    body?: PayloadRichTextValue;
    publishDate?: string | null;
    locationSlug?: string | null;
    heroImage?: string | null;
    heroMedia?: string | number | PayloadMediaDoc | null;
    postType?: 'article' | 'external' | string | null;
    externalPublisher?: string | null;
    externalUrl?: string | null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function lexicalChildren(node: PayloadLexicalNode | null | undefined): PayloadLexicalNode[] {
    return Array.isArray(node?.children) ? node.children.filter(isRecord) as PayloadLexicalNode[] : [];
}

function lexicalRootChildren(value: unknown): PayloadLexicalNode[] {
    if (!isRecord(value) || !isRecord(value.root)) return [];

    return lexicalChildren(value.root as PayloadLexicalNode);
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

function safeHttpsUrl(value: unknown): string {
    const raw = cleanString(value);
    if (!raw || raw.length > 2048 || /[<>"'\\\s]/.test(raw)) return '';

    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return '';
    }

    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.toString();
}

function mediaDoc(value: unknown): PayloadMediaDoc | null {
    return isRecord(value) ? value as PayloadMediaDoc : null;
}

function mediaUrl(value: unknown): string {
    return safeHttpsUrl(mediaDoc(value)?.url);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
    return escapeHtml(value);
}

function safeHref(value: unknown): string {
    const href = cleanString(value);
    if (/^https?:\/\/[^\s<>"'\\]+$/i.test(href)) return href;
    if (/^mailto:[^\s<>"'\\]+$/i.test(href)) return href;
    if (/^tel:[+0-9().\-\s]+$/i.test(href)) return href;
    if (/^\/(?!\/)[^\s<>"'\\]*$/.test(href)) return href;
    return '';
}

function textFormatIncludes(format: unknown, flag: number): boolean {
    return typeof format === 'number' && (format & flag) === flag;
}

function renderFormattedText(node: PayloadLexicalNode): string {
    let html = escapeHtml(typeof node.text === 'string' ? node.text : '').replace(/\n/g, '<br>');
    if (!html) return '';

    if (textFormatIncludes(node.format, TEXT_FORMAT_CODE)) html = `<code>${html}</code>`;
    if (textFormatIncludes(node.format, TEXT_FORMAT_BOLD)) html = `<strong>${html}</strong>`;
    if (textFormatIncludes(node.format, TEXT_FORMAT_ITALIC)) html = `<em>${html}</em>`;
    if (textFormatIncludes(node.format, TEXT_FORMAT_UNDERLINE)) html = `<u>${html}</u>`;
    if (textFormatIncludes(node.format, TEXT_FORMAT_STRIKETHROUGH)) html = `<s>${html}</s>`;

    return html;
}

function renderLexicalChildren(node: PayloadLexicalNode): string {
    return lexicalChildren(node).map(renderLexicalNodeHtml).filter(Boolean).join('');
}

function renderLexicalNodeHtml(node: PayloadLexicalNode): string {
    const type = cleanString(node.type);

    if (type === 'text') return renderFormattedText(node);
    if (type === 'linebreak') return '<br>';
    if (type === 'horizontalrule') return '<hr>';

    if (type === 'paragraph') {
        const inner = renderLexicalChildren(node);
        return inner ? `<p>${inner}</p>` : '';
    }

    if (type === 'heading') {
        const inner = renderLexicalChildren(node);
        if (!inner) return '';
        const tag = ['h2', 'h3', 'h4', 'h5', 'h6'].includes(cleanString(node.tag)) ? cleanString(node.tag) : 'h2';
        return `<${tag}>${inner}</${tag}>`;
    }

    if (type === 'quote') {
        const inner = renderLexicalChildren(node);
        return inner ? `<blockquote>${inner}</blockquote>` : '';
    }

    if (type === 'list') {
        const inner = renderLexicalChildren(node);
        if (!inner) return '';
        const tag = cleanString(node.listType) === 'number' || cleanString(node.tag) === 'ol' ? 'ol' : 'ul';
        return `<${tag}>${inner}</${tag}>`;
    }

    if (type === 'listitem') {
        const inner = renderLexicalChildren(node);
        return inner ? `<li>${inner}</li>` : '';
    }

    if (type === 'link' || type === 'autolink') {
        const inner = renderLexicalChildren(node);
        const href = safeHref(node.url || node.fields?.url);
        if (!inner || !href) return inner;
        const newTabAttrs = node.fields?.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${escapeAttribute(href)}"${newTabAttrs}>${inner}</a>`;
    }

    if (type === 'upload' && cleanString(node.relationTo) === 'media') {
        const media = mediaDoc(node.value);
        const src = mediaUrl(media);
        if (!media || !src) return '';

        const alt = escapeAttribute(cleanString(media.alt));
        const caption = cleanString(node.fields?.caption) || cleanString(media.caption);
        const width = Number.isFinite(media.width) && Number(media.width) > 0
            ? ` width="${Math.round(Number(media.width))}"`
            : '';
        const height = Number.isFinite(media.height) && Number(media.height) > 0
            ? ` height="${Math.round(Number(media.height))}"`
            : '';
        const captionHtml = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '';

        return `<figure class="tm-blog-inline-image"><img src="${escapeAttribute(src)}" alt="${alt}"${width}${height} loading="lazy" decoding="async">${captionHtml}</figure>`;
    }

    return renderLexicalChildren(node);
}

function legacyTextHtml(value: string): string {
    return value
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('\n');
}

function richTextHtml(value: PayloadRichTextValue): string {
    if (typeof value === 'string') return legacyTextHtml(cleanString(value));

    return lexicalRootChildren(value)
        .map(renderLexicalNodeHtml)
        .filter(Boolean)
        .join('\n');
}

function lexicalNodePlainText(node: PayloadLexicalNode): string {
    if (typeof node.text === 'string') return node.text;
    if (cleanString(node.type) === 'linebreak') return ' ';

    return lexicalChildren(node)
        .map(lexicalNodePlainText)
        .filter(Boolean)
        .join(' ');
}

function richTextPlainText(value: PayloadRichTextValue): string {
    if (typeof value === 'string') return cleanString(value);

    return lexicalRootChildren(value)
        .map(lexicalNodePlainText)
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
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
    return mediaUrl(doc.heroMedia) || publicAssetPath(doc.heroImage) || DEFAULT_BLOG_HERO_IMAGE;
}

function blogPostSocialImage(doc: PayloadBlogPostDoc): string {
    return publicAssetPath(doc.seo?.ogImage) || blogPostHeroImage(doc);
}

export function blogPostExcerptForDoc(doc: PayloadBlogPostDoc): string {
    return richTextPlainText(doc.excerpt);
}

export function blogPostExcerptHtmlForDoc(doc: PayloadBlogPostDoc): string {
    return richTextHtml(doc.excerpt);
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
    return richTextHtml(doc.body);
}

export function blogPostIsExternal(doc: PayloadBlogPostDoc): boolean {
    return cleanString(doc.postType) === 'external';
}

export function blogPostExternalUrl(doc: PayloadBlogPostDoc): string {
    return blogPostIsExternal(doc) ? safeHttpsUrl(doc.externalUrl) : '';
}

export function blogPostExternalPublisher(doc: PayloadBlogPostDoc): string {
    const publisher = cleanString(doc.externalPublisher);
    if (publisher) return publisher;

    const externalUrl = blogPostExternalUrl(doc);
    if (!externalUrl) return '';

    try {
        return new URL(externalUrl).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

export function blogPostDocLooksRenderable(doc: PayloadBlogPostDoc): boolean {
    if (!doc || doc.published !== true) return false;
    if (!cleanString(doc.title) || !slugIsValidForBlogPost(cleanString(doc.slug))) return false;
    if (!blogPostLocationSlug(doc)) return false;
    if (!blogPostPublishDate(doc)) return false;
    if (!blogPostExcerptForDoc(doc)) return false;
    if (blogPostIsExternal(doc)) return Boolean(blogPostExternalUrl(doc));
    if (!richTextPlainText(doc.body)) return false;
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
