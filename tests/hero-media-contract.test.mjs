import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  inspectHeroVideoCss,
  inspectHeroVideoMarkup,
  inspectHeroVideoRuntime,
  listHeroVideoPartials,
  pageCssPathForMainPartial,
} from '../scripts/lib/hero-media-contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

describe('Hero Media Surface', () => {
  it('keeps video hero markup poster-first and lazy until runtime', () => {
    const partials = listHeroVideoPartials(root);

    expect(partials.length).toBeGreaterThan(0);
    for (const partial of partials) {
      expect(inspectHeroVideoMarkup(partial.html, partial.rel)).toEqual([]);
    }
  });

  it('requires poster fallback CSS before the video is ready', () => {
    const indexCss = pageCssPathForMainPartial(root, 'index-main.frag.txt');
    const css = [
      fs.readFileSync(path.join(root, 'css/base.css'), 'utf8'),
      fs.readFileSync(path.join(root, 'css/layout-guards.css'), 'utf8'),
      fs.readFileSync(indexCss, 'utf8'),
    ].join('\n');

    expect(inspectHeroVideoCss(css, 'css/base.css + css/layout-guards.css + css/page-index.css')).toEqual([]);
  });

  it('allows location hero fallback CSS to live in the shared location layer', () => {
    const locationCss = pageCssPathForMainPartial(root, 'houston-main.frag.txt');
    const css = [
      fs.readFileSync(path.join(root, 'css/base.css'), 'utf8'),
      fs.readFileSync(path.join(root, 'css/layout-guards.css'), 'utf8'),
      fs.readFileSync(path.join(root, 'css/location-page.css'), 'utf8'),
      fs.readFileSync(locationCss, 'utf8'),
    ].join('\n');

    expect(inspectHeroVideoCss(css, 'css/base.css + css/layout-guards.css + css/location-page.css + css/page-houston.css')).toEqual([]);
  });

  it('requires runtime reveal to wait until the video can paint', () => {
    const runtime = fs.readFileSync(path.join(root, 'js/page-widgets-hero-video.js'), 'utf8');

    expect(inspectHeroVideoRuntime(runtime, 'js/page-widgets-hero-video.js')).toEqual([]);
  });
});
