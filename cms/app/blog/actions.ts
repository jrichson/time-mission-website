'use server';

import { redirect } from 'next/navigation';

import {
  blogSlug,
  blogSlugIsValid,
  lexicalHasText,
  parseLexicalState,
  plainTextLexicalState,
} from '../../lib/blog-authoring';
import { requireCmsUser } from '../../lib/cms-auth';
import { LOCATION_DETAIL_OPTIONS } from '../../lib/location-details-options.js';

const locationSlugs = new Set(LOCATION_DETAIL_OPTIONS.map((option) => option.value));

function formString(formData: FormData, key: string, maxLength = 10_000): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function editorUrl(id: string, status: string, error?: string): string {
  const params = new URLSearchParams({ status });
  if (error) params.set('error', error);
  return `/blog/${encodeURIComponent(id)}?${params.toString()}`;
}

function newEditorUrl(error: string): string {
  return `/blog/new?error=${encodeURIComponent(error)}`;
}

function safeHttpsUrl(value: string): string {
  if (!value || value.length > 2048 || /[<>"'\\\s]/.test(value)) return '';

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function mediaID(value: string): number | string | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^[a-zA-Z0-9_-]{1,128}$/.test(value)) return value;
  return null;
}

function validDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function saveBlogPost(formData: FormData) {
  const submittedID = formString(formData, 'id', 128);
  const redirectPath = submittedID ? `/blog/${submittedID}` : '/blog/new';
  const { payload, user } = await requireCmsUser(redirectPath);
  const title = formString(formData, 'title', 120);
  const slug = blogSlug(formString(formData, 'slug', 120) || title);
  const locationSlug = formString(formData, 'locationSlug', 80);
  const publishDate = formString(formData, 'publishDate', 20);
  const publishDateValue = Date.parse(`${publishDate}T12:00:00.000Z`);
  const postType = formString(formData, 'postType', 20) === 'external' ? 'external' : 'article';
  const excerptText = formString(formData, 'excerpt', 600);
  const body = parseLexicalState(formString(formData, 'bodyJson', 2_000_000));
  const published = formData.get('published') === 'on';
  const includeInSitemap = formData.get('includeInSitemap') === 'on';
  const externalUrlRaw = formString(formData, 'externalUrl', 2048);
  const externalUrl = safeHttpsUrl(externalUrlRaw);
  const externalPublisher = formString(formData, 'externalPublisher', 120);
  const intent = formString(formData, 'intent', 20);
  const heroMedia = mediaID(formString(formData, 'heroMedia', 128));

  if (
    !title ||
    !blogSlugIsValid(slug) ||
    !locationSlugs.has(locationSlug) ||
    !publishDate ||
    !validDateInput(publishDate) ||
    !Number.isFinite(publishDateValue) ||
    !excerptText
  ) {
    if (submittedID) redirect(editorUrl(submittedID, 'error', 'required-fields'));
    redirect(newEditorUrl('required-fields'));
  }
  if (postType === 'external' && externalUrlRaw && !externalUrl) {
    if (submittedID) redirect(editorUrl(submittedID, 'error', 'external-url'));
    redirect(newEditorUrl('external-url'));
  }
  if (published && postType === 'external' && !externalUrl) {
    if (submittedID) redirect(editorUrl(submittedID, 'error', 'external-url-required'));
    redirect(newEditorUrl('external-url-required'));
  }
  if (published && postType === 'article' && !lexicalHasText(body)) {
    if (submittedID) redirect(editorUrl(submittedID, 'error', 'article-required'));
    redirect(newEditorUrl('article-required'));
  }

  const existingSlug = await payload.find({
    collection: 'blog-posts' as never,
    depth: 0,
    limit: 10,
    overrideAccess: false,
    user,
    where: {
      slug: { equals: slug },
    },
  });

  const matchingSlugs = existingSlug.docs as unknown as Array<{ id: number | string }>;
  if (matchingSlugs.some((doc) => String(doc.id) !== submittedID)) {
    if (submittedID) redirect(editorUrl(submittedID, 'error', 'slug-exists'));
    redirect(newEditorUrl('slug-exists'));
  }

  const currentPost = submittedID
    ? await payload
        .findByID({
          collection: 'blog-posts' as never,
          depth: 0,
          id: submittedID,
          overrideAccess: false,
          user,
        })
        .catch(() => null) as unknown as {
          seo?: {
            ogImage?: string | null;
            twitterImage?: string | null;
          } | null;
        } | null
    : null;

  const data = {
    body: postType === 'article' ? body : null,
    excerpt: plainTextLexicalState(excerptText),
    externalPublisher: postType === 'external' ? externalPublisher : null,
    externalUrl: postType === 'external' ? externalUrl : null,
    heroMedia,
    includeInSitemap,
    locationSlug,
    postType,
    publishDate: new Date(publishDateValue).toISOString(),
    published,
    seo: {
      metaDescription: formString(formData, 'metaDescription', 220),
      metaTitle: formString(formData, 'metaTitle', 90),
      ogImage: currentPost?.seo?.ogImage || null,
      robots: formString(formData, 'robots', 30) === 'noindex,follow'
        ? 'noindex,follow'
        : 'index,follow',
      twitterImage: currentPost?.seo?.twitterImage || null,
    },
    slug,
    title,
  };

  const saved = submittedID
    ? await payload.update({
        collection: 'blog-posts' as never,
        data: data as never,
        id: submittedID,
        overrideAccess: false,
        user,
      })
    : await payload.create({
        collection: 'blog-posts' as never,
        data: data as never,
        overrideAccess: false,
        user,
      });

  const savedID = String((saved as unknown as { id: number | string }).id);
  if (intent === 'preview') redirect(`/preview/blog/${encodeURIComponent(savedID)}`);
  redirect(editorUrl(savedID, 'saved'));
}
