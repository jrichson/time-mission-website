import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

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

    expect(markup).not.toContain('Time Mission Is Coming to Boston');
    expect(markup).not.toContain('No public releases yet');
    expect(page).toContain('getPublishedBlogPosts');
    expect(page).toContain('blogPostShowsInPressRoom');
    expect(page).toContain('press-releases.json');
    expect(page).toContain('pressReleases.map');
    expect(page).toContain('/css/page-press.css?v=2');
    expect(styles).toContain('.tm-resource-release-list');
    expect(releases.items).toContainEqual(expect.objectContaining({
      id: 'boston-announcement',
      title: 'Time Mission Is Coming to Boston',
      href: '/boston',
    }));
    expect(authoringForm).toContain('name="showInPressRoom"');
    expect(actions).toContain("formData.get('showInPressRoom') === 'on'");
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "show_in_press_room" boolean');
    expect(migration).toContain("'boston-announcement'");
    expect(migration).toContain('ON CONFLICT ("slug") DO UPDATE');
  });
});
