import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function lineCount(text) {
  return text.trimEnd().split('\n').length;
}

describe('css architecture contract', () => {
  it('keeps shared base styles split by responsibility', () => {
    const expectedFiles = [
      'css/base.css',
      'css/layout-guards.css',
      'css/social-proof.css',
      'css/game-popup.css',
      'css/small-viewport-overrides.css',
      'css/page-shell.css',
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(root, file)), file).toBe(true);
      expect(lineCount(read(file)), file).toBeLessThan(700);
    }

    const siteHead = read('src/components/SiteHead.astro');
    const linkedAssets = [...siteHead.matchAll(/href="(\/css\/(?:base|layout-guards|social-proof|game-popup|small-viewport-overrides|page-shell)\.css(?:\?v=\d+)?)"/g)]
      .map((match) => match[1].split('?')[0]);

    expect(linkedAssets).toEqual([
      '/css/base.css',
      '/css/layout-guards.css',
      '/css/social-proof.css',
      '/css/game-popup.css',
      '/css/small-viewport-overrides.css',
      '/css/page-shell.css',
    ]);
  });

  it('keeps shared navigation styles split by responsibility', () => {
    const expectedFiles = [
      'css/nav-ticker.css',
      'css/nav.css',
      'css/mobile-menu.css',
      'css/location-overlay.css',
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(root, file)), file).toBe(true);
      expect(lineCount(read(file)), file).toBeLessThan(700);
    }

    const navCss = read('css/nav.css');
    expect(navCss).not.toMatch(/Announcement Ticker/);
    expect(navCss).not.toMatch(/Full-screen Mobile Menu/);
    expect(navCss).not.toMatch(/Full-screen Location Overlay/);

    const siteHead = read('src/components/SiteHead.astro');
    const linkedAssets = [...siteHead.matchAll(/href="(\/css\/(?:nav-ticker|nav|mobile-menu|location-overlay)\.css\?v=\d+)"/g)]
      .map((match) => match[1].split('?')[0]);

    expect(linkedAssets).toEqual([
      '/css/nav-ticker.css',
      '/css/nav.css',
      '/css/mobile-menu.css',
      '/css/location-overlay.css',
    ]);
  });

  it('keeps homepage styles split by section responsibility', () => {
    const expectedFiles = [
      'css/page-index.css',
      'css/page-index-hero.css',
      'css/page-index-intro-stats.css',
      'css/page-index-experiences.css',
      'css/page-index-groups.css',
      'css/page-index-flow.css',
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(root, file)), file).toBe(true);
      expect(lineCount(read(file)), file).toBeLessThan(700);
    }

    const indexPage = read('src/pages/index.astro');
    const linkedAssets = [...indexPage.matchAll(/href="(\/css\/page-index(?:-[a-z-]+)?\.css\?v=\d+)"/g)]
      .map((match) => match[1].split('?')[0]);

    expect(linkedAssets).toEqual([
      '/css/page-index.css',
      '/css/page-index-hero.css',
      '/css/page-index-intro-stats.css',
      '/css/page-index-experiences.css',
      '/css/page-index-groups.css',
      '/css/page-index-flow.css',
    ]);
  });
});
