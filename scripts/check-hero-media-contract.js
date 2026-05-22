'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runCheck } = require('./lib/validation-core');
const {
  inspectHeroVideoCss,
  inspectHeroVideoMarkup,
  inspectHeroVideoRuntime,
  listHeroVideoPartials,
  pageCssPathForMainPartial,
} = require('./lib/hero-media-contract');

const root = path.resolve(__dirname, '..');

runCheck({
  title: 'Hero media contract check',
  run(errors) {
    const partials = listHeroVideoPartials(root);
    const baseCss = fs.readFileSync(path.join(root, 'css', 'base.css'), 'utf8');
    const locationPageCss = fs.readFileSync(path.join(root, 'css', 'location-page.css'), 'utf8');
    if (!partials.length) {
      errors.push('No hero video partials found');
      return;
    }

    for (const partial of partials) {
      errors.push(...inspectHeroVideoMarkup(partial.html, partial.rel));

      const cssPath = pageCssPathForMainPartial(root, partial.name);
      if (!fs.existsSync(cssPath)) {
        errors.push(`${partial.rel}: missing matching page CSS file`);
        continue;
      }
      const cssRel = path.relative(root, cssPath);
      errors.push(...inspectHeroVideoCss(
        `${baseCss}\n${locationPageCss}\n${fs.readFileSync(cssPath, 'utf8')}`,
        `css/base.css + css/location-page.css + ${cssRel}`,
      ));
    }

    const runtimeRel = 'js/page-widgets.js';
    errors.push(...inspectHeroVideoRuntime(
      fs.readFileSync(path.join(root, runtimeRel), 'utf8'),
      runtimeRel,
    ));

    for (const rel of [
      'assets/video/hero-bg-mobile.mp4',
      'public/assets/video/hero-bg-mobile.mp4',
      'dist/assets/video/hero-bg-mobile.mp4',
    ]) {
      if (fs.existsSync(path.join(root, rel))) errors.push(`${rel}: stale old hero MP4 should not be bundled`);
    }
  },
  onSuccess() {
    return `Hero media contract check passed for ${listHeroVideoPartials(root).length} video hero partials.`;
  },
});
