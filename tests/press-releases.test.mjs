import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PRESS_RELEASES_SNAPSHOT } from '../cms/migration-data/20260818_press_releases_snapshot';
import { blogPostBodyHtml } from '../src/lib/payload/blog-post-contract';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('press releases page', () => {
  it('renders structured fallback releases and CMS-managed press-room posts', () => {
    const markup = fs.readFileSync(
      path.join(root, 'src/partials/press-releases-main.frag.txt'),
      'utf8',
    );
    const page = fs.readFileSync(path.join(root, 'src/pages/press/releases.astro'), 'utf8');
    const releases = JSON.parse(
      fs.readFileSync(path.join(root, 'src/data/site/press-releases.json'), 'utf8'),
    );
    const authoringForm = fs.readFileSync(
      path.join(root, 'cms/components/BlogAuthoringForm.tsx'),
      'utf8',
    );
    const actions = fs.readFileSync(path.join(root, 'cms/app/blog/actions.ts'), 'utf8');
    const styles = fs.readFileSync(path.join(root, 'css/page-press.css'), 'utf8');
    const migration = fs.readFileSync(
      path.join(root, 'cms/migrations/20260818_090000_blog_press_room_placement.ts'),
      'utf8',
    );
    const contentMigration = fs.readFileSync(
      path.join(root, 'cms/migrations/20260818_130000_press_release_content.ts'),
      'utf8',
    );
    const blogPage = fs.readFileSync(path.join(root, 'src/pages/blog/[slug].astro'), 'utf8');

    expect(markup).not.toContain('Time Mission Is Coming to Boston');
    expect(markup).not.toContain('No public releases yet');
    expect(page).toContain('getPublishedBlogPosts');
    expect(page).toContain('blogPostShowsInPressRoom');
    expect(page).toContain('press-releases.json');
    expect(page).toContain('pressReleases.map');
    expect(page).toContain('/css/page-press.css?v=3');
    expect(page).toContain('tm-resource-release-media');
    expect(page).toContain('tm-resource-release-source-copy');
    expect(page).toContain('data-page-i18n="ignore"');
    expect(page).toContain('fallbackById');
    expect(styles).toContain('.tm-resource-release-list');
    expect(styles).toContain('grid-template-columns: minmax(16rem, 0.78fr) minmax(0, 1.22fr)');
    expect(releases.items).toContainEqual(expect.objectContaining({
      id: 'boston-announcement',
      title: "Time Mission Announces New Immersive Adventure Steps from Boston's Faneuil Hall",
      href: 'https://www.timemission.com/blog/boston-announcement',
      image: '/assets/photos/experiences/Time-Mission_Control-Room-1200.webp',
      imageWidth: 1200,
      imageHeight: 1800,
    }));
    expect(releases.items).toContainEqual(expect.objectContaining({
      id: 'time-mission-global-expansion-2027',
      href: 'https://www.timemission.com/blog/time-mission-global-expansion-2027',
      image: '/assets/photos/TM-Groups-1200.webp',
      imageWidth: 1200,
      imageHeight: 800,
    }));
    expect(authoringForm).toContain('name="showInPressRoom"');
    expect(actions).toContain("formData.get('showInPressRoom') === 'on'");
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "show_in_press_room" boolean');
    expect(migration).toContain("'boston-announcement'");
    expect(migration).toContain('ON CONFLICT ("slug") DO UPDATE');
    expect(contentMigration).toContain('PRESS_RELEASES_SNAPSHOT');
    expect(contentMigration).toContain('"show_in_press_room"');
    expect(contentMigration).toContain('ON CONFLICT ("slug") DO UPDATE');
    expect(blogPage).toContain('tm-blog-article-hero--press');
    expect(blogPage).toContain('/css/page-blog.css?v=3');
    expect(blogPage).toContain("data-page-i18n={isPressRelease ? 'ignore' : undefined}");
  });

  it('preserves both attached press releases as renderable rich text', () => {
    expect(PRESS_RELEASES_SNAPSHOT).toHaveLength(2);

    const boston = PRESS_RELEASES_SNAPSHOT.find((release) => release.slug === 'boston-announcement');
    const global = PRESS_RELEASES_SNAPSHOT.find(
      (release) => release.slug === 'time-mission-global-expansion-2027',
    );
    expect(boston).toBeDefined();
    expect(global).toBeDefined();
    if (!boston || !global) throw new Error('Press release snapshots missing');

    const bostonHtml = blogPostBodyHtml({
      id: boston.slug,
      title: boston.title,
      slug: boston.slug,
      body: boston.body,
    });
    const globalHtml = blogPostBodyHtml({
      id: global.slug,
      title: global.title,
      slug: global.slug,
      body: global.body,
    });

    expect(bostonHtml).toContain('8,600-square-foot venue at Marketplace Center');
    expect(bostonHtml).toContain('Rob Cooper, CEO of LOL Entertainment');
    expect(bostonHtml).toContain('href="mailto:info@kmprllc.com"');
    expect(globalHtml).toContain('15 to 20 new locations planned for 2027');
    expect(globalHtml).toContain('<li>Eindhoven, Netherlands</li>');
    expect(globalHtml).toContain('Pieter Martens, CEO and Founder of Time Mission');
  });
});
