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
    for (const file of walk('src')) {
      for (const tag of imgTags(read(file))) {
        const a = attrs(tag);
        if (!a.width || !a.height) {
          errors.push(`${file}: image is missing width/height reservation: ${tag.slice(0, 140)}`);
        }
      }
    }

    const siteHead = read('src/components/SiteHead.astro');
    if (/fonts\.(googleapis|gstatic)\.com/.test(siteHead)) {
      errors.push('SiteHead.astro: performance-sensitive routes must use local fonts, not Google Fonts');
    }
    for (const href of [
      '/assets/fonts/BebasNeue-Regular.woff2',
      '/assets/fonts/DMSans-Normal.woff2',
      '/assets/fonts/MonumentExtended-Regular.otf',
      '/assets/fonts/MonumentExtended-Ultrabold.otf',
    ]) {
      if (!linkTags(siteHead).some((tag) => {
        const a = attrs(tag);
        return a.rel === 'preload' && a.as === 'font' && a.href === href && a.crossorigin === true;
      })) {
        errors.push(`SiteHead.astro: missing local font preload for ${href}`);
      }
    }

    const landingPage = read('src/pages/c/[slug].astro');
    if (!/<img[^>]+src=\{heroImage\}[^>]+loading="eager"[^>]+fetchpriority="high"/.test(landingPage)) {
      errors.push('src/pages/c/[slug].astro: landing hero image must be eager and fetchpriority="high"');
    }

    const pagesDir = path.join(root, 'src', 'pages');
    for (const file of fs.readdirSync(pagesDir).filter((name) => name.endsWith('.astro'))) {
      const rel = path.join('src', 'pages', file);
      const html = read(rel);
      if (html.includes('/assets/video/hero-poster-960.webp') && !hasPreload(rel, '/assets/video/hero-poster.jpg')) {
        errors.push(`${rel}: video poster preload must use fetchpriority="high"`);
      }
      if (html.includes('/assets/video/hero-poster-960.webp') && !hasPreload(rel, '/assets/video/hero-poster-960.webp')) {
        errors.push(`${rel}: mobile video poster preload must use the 960px WebP with fetchpriority="high"`);
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
      'src/pages/missions.astro': '/assets/photos/experiences/experiences-hero-640.webp',
    };
    for (const [file, href] of Object.entries(responsivePreloads)) {
      if (!hasPreload(file, href, true)) {
        errors.push(`${file}: mobile LCP image preload must be responsive WebP with fetchpriority="high"`);
      }
    }

    const missionsHtml = read('src/partials/missions-main.frag.txt');
    if (!/media="\(max-width: 768px\)"[^>]+srcset="\/assets\/photos\/experiences\/experiences-hero-640\.webp 640w, \/assets\/photos\/experiences\/experiences-hero-960\.webp 960w"/.test(missionsHtml)) {
      errors.push('src/partials/missions-main.frag.txt: mobile hero picture must cap the LCP candidate set at 960w');
    }

    for (const tag of imgTags(missionsHtml).filter((tag) => tag.includes('src="/assets/photos/experiences/Time-Mission'))) {
      const a = attrs(tag);
      if (a.loading === 'lazy' && a.fetchpriority !== 'low') {
        errors.push(`src/partials/missions-main.frag.txt: below-fold mission card image must use fetchpriority="low": ${tag.slice(0, 140)}`);
      }
    }

    if (!hasPreload('src/pages/gift-cards.astro', '/assets/logo/tm-gift-card.webp', true)) {
      errors.push('src/pages/gift-cards.astro: gift-card LCP image must preload responsive WebP candidates with fetchpriority="high"');
    }
    const giftCardsHtml = read('src/partials/gift-cards-main.frag.txt');
    if (!giftCardsHtml.includes('/assets/logo/tm-gift-card-640.webp 640w')) {
      errors.push('src/partials/gift-cards-main.frag.txt: gift-card hero must use resized WebP srcset candidates');
    }
    const giftCardImg = imgTags(giftCardsHtml).find((tag) => tag.includes('tm-gift-card-1280.png'));
    if (!giftCardImg) {
      errors.push('src/partials/gift-cards-main.frag.txt: missing gift-card hero image');
    } else {
      const a = attrs(giftCardImg);
      if (a.loading !== 'eager' || a.fetchpriority !== 'high') {
        errors.push(`src/partials/gift-cards-main.frag.txt: gift-card hero image must be eager with fetchpriority="high": ${giftCardImg.slice(0, 140)}`);
      }
    }

    if (!hasPreload('src/pages/groups.astro', '/assets/video/groups-hero-poster.jpg')) {
      errors.push('src/pages/groups.astro: groups hero poster must preload with fetchpriority="high"');
    }
    if (!hasPreload('src/pages/groups.astro', '/assets/video/groups-hero-poster-960.webp')) {
      errors.push('src/pages/groups.astro: groups mobile hero poster must preload the 960px WebP with fetchpriority="high"');
    }
    const groupsHtml = read('src/partials/groups-main.frag.txt');
    if (!/<video[^>]+poster="\/assets\/video\/groups-hero-poster-960\.webp"[^>]+preload="none"/.test(groupsHtml)) {
      errors.push('src/partials/groups-main.frag.txt: groups hero video must use the mobile WebP poster and preload="none"');
    }
    if (!/<source[^>]+src="\{\{TM_MEDIA_BASE\}\}\/assets\/video\/groups-hero\.mp4"[^>]+media="\(min-width: 769px\)"/.test(groupsHtml)) {
      errors.push('src/partials/groups-main.frag.txt: groups hero MP4 source must be desktop-only so mobile keeps the poster');
    }

    const siteScripts = read('src/components/SiteScripts.astro');
    for (const src of ['/js/web-vitals.iife.js', '/js/web-vitals-rum.js', '/js/contact-form-analytics.js', '/js/form-protection.js']) {
      if (new RegExp(`<script[^>]+src=["']${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(siteScripts)) {
        errors.push(`SiteScripts.astro must lazy-load ${src} instead of eager global defer loading`);
      }
    }
    for (const needle of ['scheduleIdle', "appendLazyScript('webVitalsLibrary'", "appendLazyScript('webVitalsRum'"]) {
      if (!siteScripts.includes(needle)) errors.push(`SiteScripts.astro missing lazy script marker: ${needle}`);
    }
    const runtimeContract = read('src/lib/public-runtime-contract.ts');
    for (const src of ['/js/web-vitals.iife.js', '/js/web-vitals-rum.js', '/js/contact-form-analytics.js', '/js/form-protection.js']) {
      if (!runtimeContract.includes(src)) errors.push(`public-runtime-contract.ts missing lazy runtime script: ${src}`);
    }

    const widgets = [
      'js/page-widgets-shared.js',
      'js/page-widgets-experiences.js',
      'js/page-widgets-effects.js',
      'js/page-widgets-content.js',
    ].map(read).join('\n');
    for (const needle of [
      'function runWhenVisible',
      'IntersectionObserver',
      'runWhenVisible(scrollEl, startAutoScroll, stopAutoScroll',
      'runWhenVisible(logosContainer, startTicker, stopTicker',
    ]) {
      if (!widgets.includes(needle)) errors.push(`page widgets runtime missing mobile visibility gate: ${needle}`);
    }
  },
  onSuccess() {
    return 'Mobile performance contract passed.';
  },
});
