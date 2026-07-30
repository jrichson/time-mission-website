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
  it('makes search and sharing settings distinct from page editing', () => {
    const sitePages = read('cms/collections/SitePages.js');
    const home = read('cms/app/page.tsx');

    expect(sitePages).toContain("singular: 'Search & Sharing Page'");
    expect(sitePages).toContain("plural: 'Search & Sharing'");
    expect(sitePages).toContain('does not change page copy or layout');
    expect(sitePages).not.toContain("singular: 'Existing Page'");
    expect(home).toContain('Search & sharing');
    expect(home).toContain('without changing page copy or layout');
  });

  it('uses deploy-gated CMS publishing language', () => {
    const landings = read('cms/collections/Landings.js');
    const locationDetails = read('cms/collections/LocationDetails.js');
    const sitePages = read('cms/collections/SitePages.js');
    const home = read('cms/app/page.tsx');

    for (const copy of ['Published in CMS', 'Live after deploy']) {
      expect(landings).toContain(copy);
      expect(locationDetails).toContain(copy);
      expect(sitePages).toContain(copy);
      expect(home).toContain(copy);
    }
  });
});
