'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walk(dir, out = []) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (rel.startsWith(path.join('public', 'assets'))) continue;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(astro|txt|html)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

function attrs(tag) {
  const out = {};
  for (const match of String(tag || '').matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(["'])(.*?)\2)?/g)) {
    const name = match[1].toLowerCase();
    if (name === 'img' || name === 'link') continue;
    out[name] = match[3] === undefined ? true : match[3];
  }
  return out;
}

function linkTags(html) {
  return [...String(html || '').matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
}

function imgTags(html) {
  return [...String(html || '').matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
}

function hasPreload(file, href, requireResponsive = false) {
  return linkTags(read(file)).some((tag) => {
    const a = attrs(tag);
    if (a.rel !== 'preload' || a.as !== 'image' || a.href !== href) return false;
    if (a.fetchpriority !== 'high') return false;
    if (requireResponsive && (!a.imagesrcset || !a.imagesizes || a.type !== 'image/webp')) return false;
    return true;
  });
}

runCheck({
  title: 'Mobile performance contract',
  run(errors) {
    const rootStaticHtml = ['404.html', 'groups.html', 'gift-cards.html', 'missions.html']
      .filter((file) => fs.existsSync(path.join(root, file)));

    for (const file of walk('src').concat(rootStaticHtml)) {
      for (const tag of imgTags(read(file))) {
        const a = attrs(tag);
        if (!a.width || !a.height) {
          errors.push(`${file}: image is missing width/height reservation: ${tag.slice(0, 140)}`);
        }
      }
    }

    const pagesDir = path.join(root, 'src', 'pages');
    for (const file of fs.readdirSync(pagesDir).filter((name) => name.endsWith('.astro'))) {
      const rel = path.join('src', 'pages', file);
      const html = read(rel);
      if (html.includes('/assets/video/hero-poster.jpg') && !hasPreload(rel, '/assets/video/hero-poster.jpg')) {
        errors.push(`${rel}: video poster preload must use fetchpriority="high"`);
      }
    }

    const responsivePreloads = {
      'src/pages/about.astro': '/assets/photos/venue/_Time-Mission_0078-480.webp',
      'src/pages/groups/bachelor-ette.astro': '/assets/photos/groups/bachelor-bachelorette-480.webp',
      'src/pages/groups/birthdays.astro': '/assets/photos/TM-Groups-480.webp',
      'src/pages/groups/corporate.astro': '/assets/photos/groups/corporate-events-480.webp',
      'src/pages/groups/field-trips.astro': '/assets/photos/groups/field-trips-480.webp',
      'src/pages/groups/holidays.astro': '/assets/photos/groups/holiday-parties-480.webp',
      'src/pages/groups/private-events.astro': '/assets/photos/venue/_Time-Mission_0024-480.webp',
    };
    for (const [file, href] of Object.entries(responsivePreloads)) {
      if (!hasPreload(file, href, true)) {
        errors.push(`${file}: mobile LCP image preload must be responsive WebP with fetchpriority="high"`);
      }
    }

    const siteScripts = read('src/components/SiteScripts.astro');
    for (const src of ['/js/web-vitals.iife.js', '/js/web-vitals-rum.js', '/js/contact-form-analytics.js', '/js/form-protection.js']) {
      if (new RegExp(`<script[^>]+src=["']${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(siteScripts)) {
        errors.push(`SiteScripts.astro must lazy-load ${src} instead of eager global defer loading`);
      }
    }
    for (const needle of ['scheduleIdle', "appendScript('/js/web-vitals.iife.js'", "appendScript('/js/web-vitals-rum.js?v=1'"]) {
      if (!siteScripts.includes(needle)) errors.push(`SiteScripts.astro missing lazy script marker: ${needle}`);
    }

    const widgets = read('js/page-widgets.js');
    for (const needle of [
      'function runWhenVisible',
      'IntersectionObserver',
      'runWhenVisible(scrollEl, startAutoScroll, stopAutoScroll',
      'runWhenVisible(logosContainer, startTicker, stopTicker',
    ]) {
      if (!widgets.includes(needle)) errors.push(`js/page-widgets.js missing mobile visibility gate: ${needle}`);
    }
  },
  onSuccess() {
    return 'Mobile performance contract passed.';
  },
});
