import { describe, expect, it } from 'vitest';
import {
  sitePageDocLooksRenderable,
  sitePageHeadForDoc,
  sitePagePathIsValid,
} from '../src/lib/payload/site-page-contract';

const baseDoc = {
  path: '/about',
  seo: {
    metaTitle: 'About Time Mission',
    metaDescription: 'Learn about Time Mission.',
    ogImage: '/assets/og.jpg',
  },
};

describe('Payload existing-page contract', () => {
  it('accepts clean existing-page paths and rejects landing-page paths', () => {
    expect(sitePagePathIsValid('/')).toBe(true);
    expect(sitePagePathIsValid('/groups/birthdays')).toBe(true);
    expect(sitePagePathIsValid('/c/spring-break')).toBe(false);
    expect(sitePagePathIsValid('/Bad Slug')).toBe(false);
  });

  it('requires enough SEO metadata to override a static page head', () => {
    expect(sitePageDocLooksRenderable(baseDoc)).toBe(true);
    expect(sitePageDocLooksRenderable({ ...baseDoc, seo: { ...baseDoc.seo, ogImage: '' } })).toBe(false);
    expect(sitePageHeadForDoc(baseDoc)).toMatchObject({
      metaTitle: 'About Time Mission',
      metaDescription: 'Learn about Time Mission.',
      robots: 'index,follow',
      ogImage: '/assets/og.jpg',
    });
  });
});
