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
  blogPostExcerptForDoc,
  blogPostExcerptHtmlForDoc,
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
  tabs?: Array<{ fields?: CollectionField[] }>;
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
    for (const tab of field?.tabs ?? []) {
      const nested = findField(tab.fields ?? [], name);
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

type RichTextNode = Record<string, unknown>;

function richText(children: RichTextNode[]): PayloadBlogPostDoc['body'] {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children,
    },
  } as PayloadBlogPostDoc['body'];
}

function paragraph(children: RichTextNode[]): RichTextNode {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    children,
  };
}

function text(value: string, format = 0): RichTextNode {
  return {
    detail: 0,
    format,
    mode: 'normal',
    style: '',
    text: value,
    type: 'text',
    version: 1,
  };
}

describe('CMS blog posts', () => {
  it('registers a location-specific Payload collection', () => {
    const config = read('cms/payload.config.ts');
    const migration = read('cms/migrations/20260624_090000_blog_press_donation_eindhoven.ts');
    const richTextMigration = read('cms/migrations/20260625_090000_blog_posts_rich_text.ts');
    const enumMigration = read('cms/migrations/20260624_085000_add_eindhoven_location_enum.ts');
    const migrationIndex = read('cms/migrations/index.ts');
    const slugField = findField(BlogPosts.fields, 'slug');
    const locationField = findField(BlogPosts.fields, 'locationSlug');
    const publishedField = findField(BlogPosts.fields, 'published');
    const includeInSitemapField = findField(BlogPosts.fields, 'includeInSitemap');
    const excerptField = findField(BlogPosts.fields, 'excerpt');
    const bodyField = findField(BlogPosts.fields, 'body');

    expect(config).toContain('BlogPosts as CollectionConfig');
    expect(BlogPosts.labels.singular).toBe('Blog Post');
    expect(BlogPosts.admin.description).toContain('main blog');
    expect(BlogPosts.admin.defaultColumns).toEqual([
      'title',
      'locationSlug',
      'published',
      'publishDate',
      'updatedAt',
    ]);
    expect(slugField).toMatchObject({ name: 'slug', type: 'text', required: true, unique: true });
    expect(locationField).toMatchObject({ name: 'locationSlug', type: 'select', required: true });
    expect(locationField?.options).toContainEqual({ label: 'Time Mission Eindhoven', value: 'eindhoven' });
    expect(publishedField?.label).toBe('Published in CMS');
    expect(publishedField?.admin?.description).toContain('Live after deploy');
    expect(includeInSitemapField?.defaultValue).toBe(true);
    expect(excerptField).toMatchObject({ name: 'excerpt', type: 'richText', required: true });
    expect(bodyField).toMatchObject({ name: 'body', type: 'richText', required: true });
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "blog_posts"');
    expect(migration).toContain('enum_blog_posts_location_slug');
    expect(migration).not.toContain('enum_location_details_location_slug" ADD VALUE');
    expect(richTextMigration).toContain('ADD COLUMN IF NOT EXISTS "excerpt_rich" jsonb');
    expect(richTextMigration).toContain('RENAME COLUMN "body_rich" TO "body"');
    expect(enumMigration).toContain("ADD VALUE IF NOT EXISTS 'eindhoven'");
    expect(migrationIndex.indexOf('20260624_085000_add_eindhoven_location_enum')).toBeLessThan(
      migrationIndex.indexOf('20260624_090000_blog_press_donation_eindhoven'),
    );
    expect(migrationIndex.indexOf('20260624_090000_blog_press_donation_eindhoven')).toBeLessThan(
      migrationIndex.indexOf('20260625_090000_blog_posts_rich_text'),
    );
    expect(migrationIndex).toContain('20260624_090000_blog_press_donation_eindhoven');
    expect(migrationIndex).toContain('20260625_090000_blog_posts_rich_text');
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

  it('renders rich-text excerpts and body content safely', () => {
    const richPost: PayloadBlogPostDoc = {
      ...basePost,
      excerpt: richText([
        paragraph([
          text('A '),
          text('bold', 1),
          text(' Houston update.'),
        ]),
      ]),
      body: richText([
        {
          type: 'heading',
          tag: 'h2',
          format: '',
          indent: 0,
          version: 1,
          children: [text('Arrival Notes')],
        },
        paragraph([
          text('Use the '),
          {
            type: 'link',
            fields: { url: 'https://timemission.com/houston', newTab: true },
            children: [text('booking link')],
          },
          text(' and skip '),
          {
            type: 'link',
            fields: { url: 'javascript:alert(1)' },
            children: [text('bad links')],
          },
          text(' <script>.'),
        ]),
        {
          type: 'list',
          listType: 'bullet',
          children: [
            {
              type: 'listitem',
              children: [text('Team play')],
            },
          ],
        },
        {
          type: 'quote',
          children: [text('Mission ready.')],
        },
      ]),
    };

    expect(blogPostDocLooksRenderable(richPost)).toBe(true);
    expect(blogPostExcerptForDoc(richPost)).toBe('A bold Houston update.');
    expect(blogPostExcerptHtmlForDoc(richPost)).toContain('<strong>bold</strong>');
    expect(blogPostHeadForDoc(richPost)).toMatchObject({
      metaDescription: 'A bold Houston update.',
    });

    const html = blogPostBodyHtml(richPost);
    expect(html).toContain('<h2>Arrival Notes</h2>');
    expect(html).toContain(
      '<a href="https://timemission.com/houston" target="_blank" rel="noopener noreferrer">booking link</a>',
    );
    expect(html).toContain('bad links');
    expect(html).not.toContain('javascript:alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<ul><li>Team play</li></ul>');
    expect(html).toContain('<blockquote>Mission ready.</blockquote>');
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

  it('keeps the production blog launch discoverable and deployment-gated', () => {
    const routes = JSON.parse(read('src/data/routes.json'));
    const navigation = JSON.parse(read('src/data/site/navigation.json'));
    const footer = JSON.parse(read('src/data/site/footer.json'));
    const blogRoute = routes.routes.find((route: { id?: string }) => route.id === 'blog');
    const workflow = read('.github/workflows/cms-wrangler-deploy.yml');
    const payloadDistCheck = read('scripts/check-payload-dist.mjs');
    const locationBlogPage = read('src/pages/blog/[slug].astro');

    expect(blogRoute?.sitemap).toBe(false);
    expect(navigation.primary).toContainEqual({ label: 'Blog', href: '/blog' });
    expect(footer.columns.flatMap((column: { links: unknown[] }) => column.links))
      .toContainEqual({ label: 'Blog', href: '/blog' });
    expect(workflow.indexOf('npm run check:payload-dist')).toBeLessThan(
      workflow.indexOf('npx wrangler pages deploy dist'),
    );
    expect(payloadDistCheck).toContain("fetchPublishedDocs('blog-posts')");
    expect(payloadDistCheck).toContain('blogPostDocLooksRenderable');
    expect(payloadDistCheck).toContain('dist/blog/${slug}.html');
    expect(locationBlogPage).toContain(
      ".filter((location) => posts.some((post) => blogPostLocationSlug(post) === location.slug))",
    );
  });
});
