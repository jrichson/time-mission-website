import { describe, expect, it } from 'vitest';
import {
  landingArchetypeForDoc,
  landingCtaForDoc,
  landingDocLooksRenderable,
  landingLaunchStateForDoc,
  landingReviewWarningsForDoc,
  landingShouldAppearInSitemap,
  landingTemplateForDoc,
  landingTemplateLabel,
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

    expect(landingCtaForDoc({ ...baseDoc, template: 'group_event', content: { ...baseDoc.content } })).toMatchObject({
      surface: 'contact',
      primaryHref: '/contact',
      bookTrigger: false,
      linkPath: '/contact',
    });

    expect(landingCtaForDoc({ ...baseDoc, template: 'coming_soon', content: { ...baseDoc.content } })).toMatchObject({
      surface: 'contact',
      primaryHref: '/contact',
      bookTrigger: false,
      linkPath: '/contact',
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

  it('normalizes landing templates from the CMS model', () => {
    expect(landingArchetypeForDoc(baseDoc)).toBe('paid_social_campaign');
    expect(landingArchetypeForDoc({ ...baseDoc, template: 'campaign' })).toBe('paid_social_campaign');
    expect(landingArchetypeForDoc({ ...baseDoc, template: 'group_event' })).toBe('group_event');
    expect(landingArchetypeForDoc({ ...baseDoc, template: 'location_promo' })).toBe('local_venue_city');
    expect(landingArchetypeForDoc({ ...baseDoc, template: 'coming_soon' })).toBe('local_venue_city');
    expect(landingArchetypeForDoc({ ...baseDoc, template: 'not-a-template' })).toBe('paid_social_campaign');
    expect(landingTemplateForDoc({ ...baseDoc, template: 'location_promo' })).toBe('local_venue_city');
    expect(landingLaunchStateForDoc({ ...baseDoc, template: 'coming_soon' })).toBe('coming_soon');
    expect(landingLaunchStateForDoc({
      ...baseDoc,
      strategy: { launchState: 'coming_soon' },
    })).toBe('coming_soon');
    expect(landingTemplateLabel('paid_social_campaign')).toBe('Paid/Social Campaign');
    expect(landingTemplateLabel('local_venue_city')).toBe('Local Venue/City');
  });

  it('ties review warnings to the campaign brief', () => {
    expect(landingReviewWarningsForDoc(baseDoc)).toEqual(expect.arrayContaining([
      'Add the source promise from the ad, post, email, search query, or campaign request.',
      'Add the visitor intent so the page copy is tied to a real decision path.',
    ]));

    const warnings = landingReviewWarningsForDoc({
      ...baseDoc,
      brief: {
        sourcePromise: 'A spring break ad promised active indoor competition for teens.',
        visitorIntent: 'Parents are deciding whether this is a good spring break outing.',
      },
      content: {
        ...baseDoc.content,
        subheadline: 'Play 25+ mission rooms in one visit.',
        bullets: [
          { text: '25+ mission rooms' },
          { text: 'Teams of 2-5' },
          { text: '60, 90, and 120 minute sessions' },
        ],
      },
    });

    expect(warnings).not.toContain('Add the source promise from the ad, post, email, search query, or campaign request.');
    expect(warnings).not.toContain('Add the visitor intent so the page copy is tied to a real decision path.');
  });
});
