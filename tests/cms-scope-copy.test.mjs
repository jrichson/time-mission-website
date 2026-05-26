import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('CMS scope copy', () => {
  it('makes page SEO overrides distinct from page editing', () => {
    const sitePages = read('cms/collections/SitePages.js');
    const home = read('cms/app/page.tsx');

    expect(sitePages).toContain("singular: 'Page SEO Override'");
    expect(sitePages).toContain("plural: 'Page SEO Overrides'");
    expect(sitePages).toContain('does not change page body copy or layout');
    expect(sitePages).not.toContain("singular: 'Existing Page'");
    expect(home).toContain('Page SEO Overrides');
    expect(home).toContain('Canonical page body copy and layouts stay code-owned.');
  });

  it('uses deploy-gated CMS publishing language', () => {
    const landings = read('cms/collections/Landings.js');
    const sitePages = read('cms/collections/SitePages.js');
    const home = read('cms/app/page.tsx');

    for (const copy of ['Published in CMS', 'Live after deploy']) {
      expect(landings).toContain(copy);
      expect(sitePages).toContain(copy);
      expect(home).toContain(copy);
    }
  });
});
