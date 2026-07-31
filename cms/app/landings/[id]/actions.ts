'use server';

import { redirect } from 'next/navigation';

import type { Landing } from '../../../payload-types';
import { requireCmsUser } from '../../../lib/cms-auth';
import { publicAssetPathIsValid } from '../../../lib/media-library.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CTA_SURFACES = new Set([
  'book_panel',
  'contact',
  'external',
  'gift_cards',
  'groups',
  'missions',
]);

function formString(formData: FormData, name: string, maxLength = 2048): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function editURL(id: string, status: string): string {
  return `/landings/${encodeURIComponent(id)}?status=${encodeURIComponent(status)}`;
}

function safeHttpsURL(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : '';
  } catch {
    return '';
  }
}

export async function saveLandingPage(formData: FormData) {
  const id = formString(formData, 'id', 128);
  const { payload, user } = await requireCmsUser(id ? `/landings/${id}` : '/landings');
  const existing = await payload
    .findByID({
      collection: 'landings',
      depth: 0,
      id,
      overrideAccess: false,
      user,
    })
    .catch(() => null) as Landing | null;

  if (!existing) redirect('/landings');

  const title = formString(formData, 'title', 120);
  const slug = formString(formData, 'slug', 120).toLowerCase();
  const headline = formString(formData, 'headline', 180);
  const subheadline = formString(formData, 'subheadline', 360);
  const primaryCtaLabel = formString(formData, 'primaryCtaLabel', 80);
  const submittedSurface = formString(formData, 'ctaSurface', 40);
  const ctaSurface: Landing['content']['ctaSurface'] = CTA_SURFACES.has(submittedSurface)
    ? submittedSurface as Landing['content']['ctaSurface']
    : 'book_panel';
  const externalRaw = formString(formData, 'ctaExternalUrl', 2048);
  const ctaExternalUrl = safeHttpsURL(externalRaw);
  const metaTitle = formString(formData, 'metaTitle', 90);
  const metaDescription = formString(formData, 'metaDescription', 220);
  const ogImage = formString(formData, 'ogImage', 512);
  const intent = formString(formData, 'intent', 20);
  const bullets = ['bullet1', 'bullet2', 'bullet3']
    .map((name) => formString(formData, name, 180))
    .filter(Boolean)
    .map((text) => ({ text }));

  if (
    !title ||
    !SLUG_PATTERN.test(slug) ||
    !headline ||
    !primaryCtaLabel ||
    !metaTitle ||
    !metaDescription ||
    !publicAssetPathIsValid(ogImage)
  ) {
    redirect(editURL(id, 'required-fields'));
  }
  if (ctaSurface === 'external' && (!externalRaw || !ctaExternalUrl)) {
    redirect(editURL(id, 'external-url'));
  }

  const slugMatches = await payload.find({
    collection: 'landings',
    depth: 0,
    limit: 10,
    overrideAccess: false,
    user,
    where: { slug: { equals: slug } },
  });
  if (slugMatches.docs.some((doc) => String(doc.id) !== id)) {
    redirect(editURL(id, 'slug-exists'));
  }

  await payload.update({
    collection: 'landings',
    data: {
      content: {
        ...existing.content,
        bullets,
        ctaExternalUrl: ctaSurface === 'external' ? ctaExternalUrl : null,
        ctaSurface,
        headline,
        primaryCtaLabel,
        subheadline,
      },
      includeInSitemap: formData.get('includeInSitemap') === 'on',
      published: formData.get('published') === 'on',
      seo: {
        ...existing.seo,
        metaDescription,
        metaTitle,
        ogImage,
        robots: formString(formData, 'robots', 30) === 'noindex,follow'
          ? 'noindex,follow'
          : 'index,follow',
      },
      slug,
      title,
    },
    id,
    overrideAccess: false,
    user,
  });

  if (intent === 'preview') {
    redirect(`/preview/landings/${encodeURIComponent(id)}`);
  }
  redirect(editURL(id, 'saved'));
}
