import { describe, expect, it } from 'vitest';
import {
  landingCtaForDoc,
  landingDocLooksRenderable,
  landingShouldAppearInSitemap,
} from '../src/lib/payload/landing-contract';

const baseDoc = {
  slug: 'spring-break',
  seo: {
    metaTitle: 'Spring Break at Time Mission',
    metaDescription: 'Plan a spring break visit.',
    ogImage: '/assets/og.jpg',
  },
  content: {
    headline: 'Spring Break Mission Rooms',
    primaryCtaLabel: 'Book now',
  },
};

describe('Payload landing contract', () => {
  it('uses one renderability rule for page and sitemap eligibility', () => {
    expect(landingDocLooksRenderable(baseDoc)).toBe(true);
    expect(landingShouldAppearInSitemap(baseDoc)).toBe(true);

    expect(landingDocLooksRenderable({ ...baseDoc, slug: 'Bad Slug' })).toBe(false);
    expect(landingShouldAppearInSitemap({ ...baseDoc, includeInSitemap: false })).toBe(false);
    expect(landingShouldAppearInSitemap({
      ...baseDoc,
      seo: { ...baseDoc.seo, robots: 'noindex,follow' },
    })).toBe(false);
  });

  it('centralizes CTA surface mapping', () => {
    expect(landingCtaForDoc(baseDoc)).toMatchObject({
      surface: 'book_panel',
      primaryHref: '#tickets',
      bookTrigger: true,
      linkPath: '/tickets',
    });

    expect(landingCtaForDoc({
      ...baseDoc,
      content: { ...baseDoc.content, ctaSurface: 'gift_cards' },
    })).toMatchObject({
      surface: 'gift_cards',
      primaryHref: '/gift-cards',
      bookTrigger: false,
      linkPath: '/gift-cards',
    });
  });
});
