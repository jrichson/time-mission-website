import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { BlogPosts } from '../cms/collections/BlogPosts.js';
import {
  blogLocationCanonicalPath,
  blogPostBodyHtml,
  blogPostCanonicalPath,
  blogPostDocLooksRenderable,
  blogPostHeadForDoc,
  blogPostHeroImage,
  blogPostShouldAppearInSitemap,
  slugIsValidForBlogPost,
  type PayloadBlogPostDoc,
} from '../src/lib/payload/blog-post-contract';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

type CollectionField = {
  admin?: { description?: string };
  defaultValue?: unknown;
  fields?: CollectionField[];
  label?: string;
  name?: string;
  options?: unknown[];
  required?: boolean;
  type?: string;
  unique?: boolean;
};

function findField(fields: CollectionField[], name: string): CollectionField | null {
  for (const field of fields) {
    if (field?.name === name) return field;
    if (Array.isArray(field?.fields)) {
      const nested = findField(field.fields, name);
      if (nested) return nested;
    }
  }
  return null;
}

const basePost: PayloadBlogPostDoc = {
  id: 1,
  title: 'Houston Opening Notes',
  slug: 'houston-opening-notes',
  excerpt: 'A short local update from Time Mission Houston.',
  body: 'First paragraph.\n\nSecond paragraph with <script>.',
  publishDate: '2026-06-24T00:00:00.000Z',
  locationSlug: 'houston',
  published: true,
  includeInSitemap: true,
};

describe('CMS blog posts', () => {
  it('registers a location-specific Payload collection', () => {
    const config = read('cms/payload.config.ts');
    const migration = read('cms/migrations/20260624_090000_blog_press_donation_eindhoven.ts');
    const enumMigration = read('cms/migrations/20260624_085000_add_eindhoven_location_enum.ts');
    const migrationIndex = read('cms/migrations/index.ts');
    const slugField = findField(BlogPosts.fields, 'slug');
    const locationField = findField(BlogPosts.fields, 'locationSlug');
    const publishedField = findField(BlogPosts.fields, 'published');
    const includeInSitemapField = findField(BlogPosts.fields, 'includeInSitemap');

    expect(config).toContain('BlogPosts as CollectionConfig');
    expect(BlogPosts.labels.singular).toBe('Blog Post');
    expect(BlogPosts.admin.description).toContain('/blog/{post-url}');
    expect(slugField).toMatchObject({ name: 'slug', type: 'text', required: true, unique: true });
    expect(locationField).toMatchObject({ name: 'locationSlug', type: 'select', required: true });
    expect(locationField?.options).toContainEqual({ label: 'Time Mission Eindhoven', value: 'eindhoven' });
    expect(publishedField?.label).toBe('Published in CMS');
    expect(publishedField?.admin?.description).toContain('Live after deploy');
    expect(includeInSitemapField?.defaultValue).toBe(true);
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "blog_posts"');
    expect(migration).toContain('enum_blog_posts_location_slug');
    expect(migration).not.toContain('enum_location_details_location_slug" ADD VALUE');
    expect(enumMigration).toContain("ADD VALUE IF NOT EXISTS 'eindhoven'");
    expect(migrationIndex.indexOf('20260624_085000_add_eindhoven_location_enum')).toBeLessThan(
      migrationIndex.indexOf('20260624_090000_blog_press_donation_eindhoven'),
    );
    expect(migrationIndex).toContain('20260624_090000_blog_press_donation_eindhoven');
  });

  it('validates renderable posts and reserved location slugs', () => {
    expect(slugIsValidForBlogPost('houston-opening-notes')).toBe(true);
    expect(slugIsValidForBlogPost('houston')).toBe(false);
    expect(blogPostDocLooksRenderable(basePost)).toBe(true);
    expect(blogPostDocLooksRenderable({ ...basePost, published: false })).toBe(false);
    expect(blogPostDocLooksRenderable({ ...basePost, locationSlug: 'unknown' })).toBe(false);
  });

  it('builds public paths, SEO fallback, sitemap state, and safe body HTML', () => {
    expect(blogPostCanonicalPath(basePost.slug!)).toBe('/blog/houston-opening-notes');
    expect(blogLocationCanonicalPath('houston')).toBe('/blog/houston');
    expect(blogPostShouldAppearInSitemap(basePost)).toBe(true);
    expect(blogPostShouldAppearInSitemap({ ...basePost, includeInSitemap: false })).toBe(false);
    expect(blogPostHeadForDoc(basePost)).toMatchObject({
      metaTitle: 'Houston Opening Notes',
      metaDescription: 'A short local update from Time Mission Houston.',
      robots: 'index,follow',
    });
    expect(blogPostBodyHtml(basePost)).toContain('&lt;script&gt;');
    expect(blogPostBodyHtml(basePost)).toContain('</p>\n<p>');
  });

  it('keeps hero art separate from SEO social art', () => {
    const post = {
      ...basePost,
      heroImage: '/assets/photos/blog-hero.jpg',
      seo: {
        ogImage: '/assets/photos/blog-og.jpg',
        twitterImage: '/assets/photos/blog-twitter.jpg',
      },
    };

    expect(blogPostHeroImage(post)).toBe('/assets/photos/blog-hero.jpg');
    expect(blogPostHeadForDoc(post)).toMatchObject({
      ogImage: '/assets/photos/blog-og.jpg',
      twitterImage: '/assets/photos/blog-twitter.jpg',
    });
  });
});
