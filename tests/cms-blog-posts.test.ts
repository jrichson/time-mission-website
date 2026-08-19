import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { BlogPosts } from '../cms/collections/BlogPosts.js';
import { Media } from '../cms/collections/Media.js';
import {
  previewBlogPostBodyHtml,
  previewBlogPostDateLabel,
  previewBlogPostExcerptHtml,
  previewBlogPostExternalPublisher,
  previewBlogPostExternalUrl,
  previewBlogPostHeroImage,
} from '../cms/lib/blog-preview-contract';
import {
  blogSlug,
  lexicalPlainText,
  parseLexicalState,
  plainTextLexicalState,
} from '../cms/lib/blog-authoring';
import {
  blogPostDateLabel,
  blogLocationCanonicalPath,
  blogPostBodyHtml,
  blogPostCanonicalPath,
  blogPostDocLooksRenderable,
  blogPostExcerptForDoc,
  blogPostExcerptHtmlForDoc,
  blogPostExternalPublisher,
  blogPostExternalUrl,
  blogPostHeadForDoc,
  blogPostHeroImage,
  blogPostIsAvailableForProfile,
  blogPostIsPressCoverage,
  blogPostPublishDateTime,
  blogPostShouldAppearInSitemap,
  blogPostShouldHaveDetailPage,
  blogPostShowsInPressRoom,
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
  relationTo?: string;
  required?: boolean;
  tabs?: Array<{ fields?: CollectionField[] }>;
  type?: string;
  unique?: boolean;
  validate?: (...args: unknown[]) => boolean | string;
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
  it('provides a custom editorial workspace with rich text, uploads, and previews', () => {
    const home = read('cms/app/page.tsx');
    const list = read('cms/app/blog/page.tsx');
    const create = read('cms/app/blog/new/page.tsx');
    const editor = read('cms/components/BlogAuthoringForm.tsx');
    const richTextEditor = read('cms/components/BlogRichTextEditor.tsx');
    const heroPicker = read('cms/components/BlogHeroPicker.tsx');
    const uploadRoute = read('cms/app/blog/media/route.ts');
    const preview = read('cms/app/preview/blog/[id]/page.tsx');
    const publicBlogRoute = read('src/pages/blog.astro');
    const publicPostRoute = read('src/pages/blog/[slug].astro');
    const sitemapRoute = read('src/pages/sitemap.xml.ts');

    expect(home).toContain("href: '/blog'");
    expect(home).not.toContain('/admin/collections/blog-posts');
    expect(list).toContain('New post');
    expect(create).toContain('Make it worth the click.');
    expect(editor).toContain('Original article');
    expect(editor).toContain('Shared link');
    expect(editor).toContain('Save and preview');
    expect(richTextEditor).toContain('contentEditable');
    expect(richTextEditor).toContain('Add image');
    expect(heroPicker).toContain('Upload and select');
    expect(uploadRoute).toContain("collection: 'media'");
    expect(uploadRoute).toContain('MAX_UPLOAD_BYTES');
    expect(preview).toContain('href={`/blog/${post.id}`}');
    expect(publicBlogRoute).toContain('.filter(blogPostShouldHaveDetailPage)');
    expect(publicPostRoute).toContain('.filter(blogPostShouldHaveDetailPage)');
    expect(sitemapRoute).toContain('blogPosts.filter(blogPostShouldHaveDetailPage)');
    expect(publicPostRoute).toContain("const postBackHref = isPressRelease");
    expect(publicPostRoute).toContain("? '/press/releases'");
    expect(publicPostRoute).toContain('blogLocationCanonicalPath(location.slug)');

    expect(blogSlug('A New Story!')).toBe('a-new-story');
    const summary = plainTextLexicalState('First sentence.\n\nSecond sentence.');
    expect(lexicalPlainText(summary)).toBe('First sentence.\n\nSecond sentence.');
    expect(parseLexicalState(JSON.stringify(summary))).toEqual(summary);
  });

  it('registers a location-specific Payload collection', () => {
    const config = read('cms/payload.config.ts');
    const migration = read('cms/migrations/20260624_090000_blog_press_donation_eindhoven.ts');
    const richTextMigration = read('cms/migrations/20260625_090000_blog_posts_rich_text.ts');
    const authoringMigration = read('cms/migrations/20260730_170000_blog_authoring_and_media.ts');
    const coverageMigration = read('cms/migrations/20260819_090000_masslive_press_coverage.ts');
    const enumMigration = read('cms/migrations/20260624_085000_add_eindhoven_location_enum.ts');
    const migrationIndex = read('cms/migrations/index.ts');
    const slugField = findField(BlogPosts.fields, 'slug');
    const locationField = findField(BlogPosts.fields, 'locationSlug');
    const publishedField = findField(BlogPosts.fields, 'published');
    const includeInSitemapField = findField(BlogPosts.fields, 'includeInSitemap');
    const showInPressRoomField = findField(BlogPosts.fields, 'showInPressRoom');
    const excerptField = findField(BlogPosts.fields, 'excerpt');
    const bodyField = findField(BlogPosts.fields, 'body');
    const postTypeField = findField(BlogPosts.fields, 'postType');
    const externalUrlField = findField(BlogPosts.fields, 'externalUrl');
    const heroMediaField = findField(BlogPosts.fields, 'heroMedia');

    expect(config).toContain('BlogPosts as CollectionConfig');
    expect(BlogPosts.labels.singular).toBe('Blog Post');
    expect(BlogPosts.admin.description).toContain('Press Room shared links');
    expect(BlogPosts.admin.defaultColumns).toEqual([
      'title',
      'locationSlug',
      'published',
      'publishDate',
      'updatedAt',
    ]);
    expect(slugField).toMatchObject({ name: 'slug', type: 'text', required: true, unique: true });
    expect(locationField).toMatchObject({ name: 'locationSlug', type: 'select' });
    expect(locationField?.required).not.toBe(true);
    expect(locationField?.validate).toBeTypeOf('function');
    expect(locationField?.validate?.(null, { data: { showInPressRoom: true } })).toBe(true);
    expect(locationField?.validate?.(null, { data: { showInPressRoom: false } })).toContain(
      'Choose a location',
    );
    expect(locationField?.options).toContainEqual({ label: 'Time Mission Eindhoven', value: 'eindhoven' });
    expect(publishedField?.label).toBe('Published in CMS');
    expect(publishedField?.admin?.description).toContain('Live after deploy');
    expect(includeInSitemapField?.defaultValue).toBe(true);
    expect(showInPressRoomField).toMatchObject({
      name: 'showInPressRoom',
      type: 'checkbox',
      defaultValue: false,
    });
    expect(showInPressRoomField?.admin?.description).toContain('shared links appear under In the News');
    expect(excerptField).toMatchObject({ name: 'excerpt', type: 'richText', required: true });
    expect(bodyField).toMatchObject({ name: 'body', type: 'richText' });
    expect(bodyField?.validate).toBeTypeOf('function');
    expect(postTypeField).toMatchObject({ name: 'postType', type: 'radio', required: true });
    expect(externalUrlField?.validate).toBeTypeOf('function');
    expect(heroMediaField).toMatchObject({ name: 'heroMedia', type: 'upload', relationTo: 'media' });
    expect(BlogPosts.admin.preview({ id: 42 })).toBe('/preview/blog/42');
    expect(Media.upload.mimeTypes).toContain('image/webp');
    expect(Media.fields).toContainEqual(expect.objectContaining({ name: 'alt', required: true }));
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "blog_posts"');
    expect(migration).toContain('enum_blog_posts_location_slug');
    expect(migration).not.toContain('enum_location_details_location_slug" ADD VALUE');
    expect(richTextMigration).toContain('ADD COLUMN IF NOT EXISTS "excerpt_rich" jsonb');
    expect(richTextMigration).toContain('RENAME COLUMN "body_rich" TO "body"');
    expect(authoringMigration).toContain('CREATE TABLE IF NOT EXISTS "media"');
    expect(authoringMigration).toContain('CREATE TABLE IF NOT EXISTS "blog_posts_rels"');
    expect(authoringMigration).toContain('ADD COLUMN IF NOT EXISTS "post_type"');
    expect(authoringMigration).toContain('ALTER COLUMN "body" DROP NOT NULL');
    expect(enumMigration).toContain("ADD VALUE IF NOT EXISTS 'eindhoven'");
    expect(migrationIndex.indexOf('20260624_085000_add_eindhoven_location_enum')).toBeLessThan(
      migrationIndex.indexOf('20260624_090000_blog_press_donation_eindhoven'),
    );
    expect(migrationIndex.indexOf('20260624_090000_blog_press_donation_eindhoven')).toBeLessThan(
      migrationIndex.indexOf('20260625_090000_blog_posts_rich_text'),
    );
    expect(migrationIndex).toContain('20260624_090000_blog_press_donation_eindhoven');
    expect(migrationIndex).toContain('20260625_090000_blog_posts_rich_text');
    expect(migrationIndex).toContain('20260730_170000_blog_authoring_and_media');
    expect(migrationIndex).toContain('20260818_090000_blog_press_room_placement');
    expect(migrationIndex).toContain('20260818_160000_nashville_press_release');
    expect(migrationIndex).toContain('20260819_090000_masslive_press_coverage');
    expect(coverageMigration).toContain("'masslive-boston-opening-2027'");
    expect(coverageMigration).toContain('"external_url"');
    expect(coverageMigration).toContain("'noindex,follow'::\"enum_blog_posts_seo_robots\"");
    expect(coverageMigration).toContain('ON CONFLICT ("slug") DO UPDATE');

    expect(bodyField?.validate?.(null, { data: { postType: 'article', published: false } })).toBe(true);
    expect(bodyField?.validate?.(null, { data: { postType: 'article', published: true } })).toContain(
      'before publishing',
    );
    expect(externalUrlField?.validate?.(null, { data: { postType: 'external', published: false } })).toBe(
      true,
    );
    expect(
      externalUrlField?.validate?.(null, { data: { postType: 'external', published: true } }),
    ).toContain('external article');
  });

  it('validates renderable posts and reserved location slugs', () => {
    expect(slugIsValidForBlogPost('houston-opening-notes')).toBe(true);
    expect(slugIsValidForBlogPost('houston')).toBe(false);
    expect(blogPostDocLooksRenderable(basePost)).toBe(true);
    expect(blogPostDocLooksRenderable({ ...basePost, published: false })).toBe(false);
    expect(blogPostDocLooksRenderable({ ...basePost, locationSlug: 'unknown' })).toBe(false);
    expect(blogPostShowsInPressRoom(basePost)).toBe(false);
    expect(blogPostShowsInPressRoom({ ...basePost, showInPressRoom: true })).toBe(true);
    expect(blogPostShowsInPressRoom({
      ...basePost,
      locationSlug: null,
      showInPressRoom: true,
    })).toBe(true);
    expect(blogPostIsAvailableForProfile(basePost, { internalRegion: 'us' })).toBe(true);
    expect(blogPostIsAvailableForProfile(basePost, { internalRegion: 'europe' })).toBe(false);
    expect(blogPostIsAvailableForProfile({
      ...basePost,
      locationSlug: null,
      showInPressRoom: true,
    }, { internalRegion: 'europe' })).toBe(true);
  });

  it('builds public paths, SEO fallback, sitemap state, and safe body HTML', () => {
    expect(blogPostCanonicalPath(basePost.slug!)).toBe('/blog/houston-opening-notes');
    expect(blogLocationCanonicalPath('houston')).toBe('/blog/houston');
    expect(blogPostPublishDateTime(basePost)).toBe('2026-06-24T00:00:00.000Z');
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

  it('renders uploaded article images and shared-link posts safely', () => {
    const articleWithImage: PayloadBlogPostDoc = {
      ...basePost,
      heroMedia: {
        alt: 'Teams moving through a Time Mission room',
        height: 800,
        id: 9,
        url: 'https://time-mission-website-production.up.railway.app/api/media/file/mission-room.webp',
        width: 1200,
      },
      body: richText([
        paragraph([text('Before the image.')]),
        {
          fields: { caption: 'Teams take on a timed challenge.' },
          relationTo: 'media',
          type: 'upload',
          value: {
            alt: 'Two teams inside a glowing mission room',
            height: 900,
            id: 10,
            url: 'https://time-mission-website-production.up.railway.app/api/media/file/teams.webp',
            width: 1400,
          },
        },
      ]),
    };

    expect(blogPostHeroImage(articleWithImage)).toContain('/api/media/file/mission-room.webp');
    expect(blogPostBodyHtml(articleWithImage)).toContain('class="tm-blog-inline-image"');
    expect(blogPostBodyHtml(articleWithImage)).toContain('alt="Two teams inside a glowing mission room"');
    expect(blogPostBodyHtml(articleWithImage)).toContain('<figcaption>Teams take on a timed challenge.</figcaption>');

    const sharedLink: PayloadBlogPostDoc = {
      ...basePost,
      body: null,
      externalPublisher: 'PR Newswire',
      externalUrl: 'https://www.prnewswire.com/news-releases/time-mission-opens-123.html',
      postType: 'external',
    };

    expect(blogPostDocLooksRenderable(sharedLink)).toBe(true);
    expect(blogPostShouldHaveDetailPage(sharedLink)).toBe(true);
    expect(blogPostIsPressCoverage(sharedLink)).toBe(false);
    expect(blogPostIsPressCoverage({ ...sharedLink, showInPressRoom: true })).toBe(true);
    expect(blogPostShouldHaveDetailPage({ ...sharedLink, showInPressRoom: true })).toBe(false);
    expect(blogPostShouldAppearInSitemap({ ...sharedLink, showInPressRoom: true })).toBe(false);
    expect(blogPostExternalPublisher(sharedLink)).toBe('PR Newswire');
    expect(blogPostExternalUrl(sharedLink)).toContain('prnewswire.com');
    expect(blogPostDocLooksRenderable({ ...sharedLink, externalUrl: 'javascript:alert(1)' })).toBe(false);

    expect(previewBlogPostHeroImage(articleWithImage)).toBe(blogPostHeroImage(articleWithImage));
    expect(previewBlogPostExcerptHtml(articleWithImage)).toBe(blogPostExcerptHtmlForDoc(articleWithImage));
    expect(previewBlogPostBodyHtml(articleWithImage)).toBe(blogPostBodyHtml(articleWithImage));
    expect(previewBlogPostDateLabel(articleWithImage)).toBe(blogPostDateLabel(articleWithImage));
    expect(previewBlogPostExternalPublisher(sharedLink)).toBe(blogPostExternalPublisher(sharedLink));
    expect(previewBlogPostExternalUrl(sharedLink)).toBe(blogPostExternalUrl(sharedLink));
  });

  it('keeps the production blog launch discoverable and deployment-gated', () => {
    const routes = JSON.parse(read('src/data/routes.json'));
    const navigation = JSON.parse(read('src/data/site/navigation.json'));
    const footer = JSON.parse(read('src/data/site/footer.json'));
    const blogRoute = routes.routes.find((route: { id?: string }) => route.id === 'blog');
    const workflow = read('.github/workflows/cms-wrangler-deploy.yml');
    const deployScript = read('scripts/deploy-pages-profile.mjs');
    const verifyPipeline = read('scripts/lib/verify-pipeline.cjs');
    const payloadDistCheck = read('scripts/check-payload-dist.mjs');
    const locationBlogPage = read('src/pages/blog/[slug].astro');

    expect(blogRoute?.sitemap).toBe(false);
    expect(navigation.primary).toContainEqual({ label: 'Blog', href: '/blog' });
    expect(footer.columns.flatMap((column: { links: unknown[] }) => column.links))
      .toContainEqual({ label: 'Blog', href: '/blog' });
    expect(workflow).toContain('npm run deploy:pages');
    expect(verifyPipeline).toContain("['check:payload-dist', []]");
    expect(deployScript.indexOf("['scripts/verify-site-output.mjs', '--artifact-only']")).toBeLessThan(
      deployScript.indexOf('createCloudflareDeploymentArtifact(root'),
    );
    expect(payloadDistCheck).toContain("fetchPublishedDocs('blog-posts')");
    expect(payloadDistCheck).toContain('blogPostShouldHaveDetailPage');
    expect(payloadDistCheck).toContain('if (!blogPostIsAvailableForProfile(doc)) continue;');
    expect(payloadDistCheck).toContain('dist/blog/${slug}.html');
    expect(locationBlogPage).toContain(
      ".filter((location) => posts.some((post) => blogPostLocationSlug(post) === location.slug))",
    );
  });
});
