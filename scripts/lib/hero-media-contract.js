'use strict';

const fs = require('node:fs');
const path = require('node:path');
const locationPageAssets = require('../../src/data/site/location-page-assets.json');

const HERO_POSTER = '/assets/photos/experiences/ready-to-play-1200.webp';
const AUTOPLAY_FALLBACK = '/assets/photos/experiences/ready-to-play-1200.webp';

function parseAttributes(tag) {
  const attrs = {};
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(["'])(.*?)\2)?/g;
  for (const match of String(tag || '').matchAll(attrRe)) {
    const name = match[1];
    if (name === 'video' || name === 'source') continue;
    attrs[name.toLowerCase()] = match[3] === undefined ? true : match[3];
  }
  return attrs;
}

function extractHeroVideo(html) {
  const match = String(html || '').match(/<video\b([^>]*)\bid=["']heroVideo["']([^>]*)>([\s\S]*?)<\/video>/i);
  if (!match) return null;
  const openTag = `${match[1] || ''} ${match[2] || ''}`;
  const body = match[3] || '';
  const sources = [...body.matchAll(/<source\b([^>]*)>/gi)].map((sourceMatch) => (
    parseAttributes(sourceMatch[1] || '')
  ));
  return {
    attrs: parseAttributes(openTag),
    body,
    sources,
  };
}

function inspectHeroVideoMarkup(html, label = 'hero markup') {
  const errors = [];
  const video = extractHeroVideo(html);
  if (!video) return [`${label}: missing <video id="heroVideo">`];

  if (video.attrs.poster !== HERO_POSTER) {
    errors.push(`${label}: hero video must use poster="${HERO_POSTER}"`);
  }
  if (video.attrs.preload !== 'none') {
    errors.push(`${label}: hero video must keep preload="none" so the poster paints first`);
  }
  if (Object.prototype.hasOwnProperty.call(video.attrs, 'autoplay')) {
    errors.push(`${label}: hero video must not include autoplay in markup`);
  }
  if (!video.sources.length) {
    errors.push(`${label}: hero video needs at least one <source data-src="...">`);
  }

  let hasResponsiveSource = false;
  for (const source of video.sources) {
    if (source.src) {
      errors.push(`${label}: hero video source must use data-src, not eager src`);
    }
    if (!source['data-src']) {
      errors.push(`${label}: hero video source is missing data-src`);
      continue;
    }
    if (!String(source['data-src']).startsWith('{{TM_MEDIA_BASE}}/assets/video/')) {
      errors.push(`${label}: hero video data-src must use {{TM_MEDIA_BASE}}/assets/video/...`);
    }
    if (!String(source['data-src']).endsWith('.mp4')) {
      errors.push(`${label}: hero video data-src must point at an MP4`);
    }
    if (source['data-media']) hasResponsiveSource = true;
  }

  if (!hasResponsiveSource) {
    errors.push(`${label}: hero video needs a data-media source for mobile first-paint control`);
  }

  return errors;
}

function inspectHeroVideoCss(css, label = 'hero css') {
  const body = String(css || '');
  const errors = [];
  if (!body.includes('.hero-video-container')) {
    errors.push(`${label}: missing .hero-video-container rule`);
  }
  if (!body.includes(HERO_POSTER)) {
    errors.push(`${label}: .hero-video-container must paint ${HERO_POSTER} as the first-paint fallback background`);
  }
  if (!body.includes('.hero-video-container.is-video-fallback') || !body.includes(AUTOPLAY_FALLBACK)) {
    errors.push(`${label}: static fallback image must be scoped to .hero-video-container.is-video-fallback`);
  }
  if (!body.includes('.hero-video-container.is-video-ready video')) {
    errors.push(`${label}: missing .hero-video-container.is-video-ready video reveal rule`);
  }
  return errors;
}

function inspectHeroVideoRuntime(js, label = 'hero runtime') {
  const body = String(js || '');
  const errors = [];
  const required = [
    ['source[data-src]', 'copy data-src to src only after first paint'],
    ["preload = 'none'", 'keep preload none before deferred load'],
    ['loadeddata', 'wait for loadeddata before playback reveal'],
    ['canplay', 'wait for canplay before playback reveal'],
    ['is-video-ready', 'reveal video only after it can paint'],
    ['is-video-fallback', 'show static fallback only when playback is limited or blocked'],
  ];
  for (const [needle, description] of required) {
    if (!body.includes(needle)) errors.push(`${label}: must ${description}`);
  }
  return errors;
}

function listHeroVideoPartials(root) {
  const partialsDir = path.join(root, 'src', 'partials');
  return fs.readdirSync(partialsDir)
    .filter((name) => name.endsWith('-main.frag.txt'))
    .map((name) => {
      const rel = path.join('src', 'partials', name);
      const abs = path.join(root, rel);
      const html = fs.readFileSync(abs, 'utf8');
      return { rel, abs, html, name };
    })
    .filter((entry) => entry.html.includes('id="heroVideo"'));
}

function pageCssPathForMainPartial(root, partialName) {
  const slug = partialName.replace(/-main\.frag\.txt$/, '');
  const href = locationPageAssets.css && locationPageAssets.css[slug];
  const cssName = href ? path.basename(String(href).split('?')[0]) : `page-${slug}.css`;
  return path.join(root, 'css', cssName);
}

module.exports = {
  HERO_POSTER,
  extractHeroVideo,
  inspectHeroVideoMarkup,
  inspectHeroVideoCss,
  inspectHeroVideoRuntime,
  listHeroVideoPartials,
  pageCssPathForMainPartial,
};
