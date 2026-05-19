import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  inspectHeroVideoCss,
  inspectHeroVideoMarkup,
  inspectHeroVideoRuntime,
  listHeroVideoPartials,
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
    const css = [
      fs.readFileSync(path.join(root, 'css/base.css'), 'utf8'),
      fs.readFileSync(path.join(root, 'src/partials/index-inline.raw.css.txt'), 'utf8'),
    ].join('\n');

    expect(inspectHeroVideoCss(css, 'css/base.css + index-inline.raw.css.txt')).toEqual([]);
  });

  it('requires runtime reveal to wait until the video can paint', () => {
    const runtime = fs.readFileSync(path.join(root, 'js/page-widgets.js'), 'utf8');

    expect(inspectHeroVideoRuntime(runtime, 'js/page-widgets.js')).toEqual([]);
  });
});
