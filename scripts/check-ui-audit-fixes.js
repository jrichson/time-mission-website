'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function walk(dir, predicate, files = []) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return files;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(rel, predicate, files);
    } else if (!predicate || predicate(rel)) {
      files.push(rel);
    }
  }
  return files;
}

function includesAny(content, needles) {
  return needles.some((needle) => content.includes(needle));
}

runCheck({
  title: 'UI audit regression contract',
  run(errors) {
    const mainPartials = walk('src/partials', (rel) => rel.endsWith('-main.frag.txt'));
    for (const rel of mainPartials) {
      const html = read(rel);
      if (html.includes('class="testimonials-scroll"') && !/<div class="testimonials-scroll"[^>]*\brole="region"/.test(html)) {
        errors.push(`${rel}: testimonials scroller needs role="region" when aria-label is present`);
      }
    }

    const giftCards = read('src/partials/gift-cards-main.frag.txt');
    if (!/<h1\b[^>]*>GIVE THE GIFT OF/.test(giftCards)) {
      errors.push('src/partials/gift-cards-main.frag.txt: gift-card hero must expose the page h1');
    }

    const contact = read('src/partials/contact-main.frag.txt');
    for (const forbidden of ['<h3>Send Us a Message</h3>', '<h3>Contact by Location</h3>', '<h4>General Inquiries</h4>']) {
      if (contact.includes(forbidden)) errors.push(`src/partials/contact-main.frag.txt: outdated contact heading remains: ${forbidden}`);
    }

    for (const rel of ['src/components/TicketPanel.astro', 'components/ticket-panel.html']) {
      const panel = read(rel);
      for (const required of [
        'role="dialog"',
        'aria-modal="true"',
        'aria-labelledby="ticketPanelTitle"',
        'aria-describedby="ticketPanelIntro"',
        'aria-hidden="true"',
        'inert',
        '<h2 id="ticketPanelTitle"',
        '<h3 data-i18n="booking.quickInfo"',
      ]) {
        if (!panel.includes(required)) errors.push(`${rel}: missing ticket panel accessibility marker ${required}`);
      }
      if (includesAny(panel, ['<h3 id="ticketPanelTitle"', '<h4 data-i18n="booking.quickInfo"'])) {
        errors.push(`${rel}: ticket panel still has old hidden heading levels`);
      }
    }

    const cssFiles = [
      ...walk('css', (rel) => rel.endsWith('.css')),
      ...walk('src/partials', (rel) => rel.endsWith('-inline.raw.css.txt')),
    ];
    for (const rel of cssFiles) {
      const css = read(rel);
      if (includesAny(css, ['transition: max-height', '@keyframes icon-bounce', 'animation: icon-bounce'])) {
        errors.push(`${rel}: layout-heavy FAQ or infinite bounce animation returned`);
      }
      if (css.includes('@media @media') || /^\s*\(prefers-reduced-motion: reduce\)/m.test(css)) {
        errors.push(`${rel}: malformed reduced-motion media query`);
      }
      if (rel === 'css/ticket-panel.css' || rel === 'css/base.css') {
        if (/transition:\s*right\b/.test(css) || /right:\s*max\(-360px,\s*-100vw\)/.test(css)) {
          errors.push(`${rel}: ticket panel must animate transform, not right`);
        }
      }
    }

    const footerPartials = walk('src/partials', (rel) => rel.endsWith('.frag.txt'));
    for (const rel of footerPartials) {
      const html = read(rel);
      if (html.includes('class="coming-soon" style=') || html.includes('class="coming-soon-tag" style=')) {
        errors.push(`${rel}: coming-soon footer styles must use shared classes, not inline styles`);
      }
    }

    const a11y = read('js/a11y.js');
    if (!a11y.includes("dialog.querySelector('.ticket-panel-header h2')")) {
      errors.push('js/a11y.js: ticket dialog enhancement must target the h2 panel title');
    }

    for (const rel of [
      'assets/video/hero-bg-mobile.mp4',
      'public/assets/video/hero-bg-mobile.mp4',
      'dist/assets/video/hero-bg-mobile.mp4',
    ]) {
      if (fs.existsSync(path.join(root, rel))) errors.push(`${rel}: stale old hero MP4 should not be bundled`);
    }
  },
});
