#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'parse5';

const root = process.cwd();
const dist = path.join(root, 'dist');
const runtime = fs.readFileSync(path.join(root, 'js/navigation-context.js'), 'utf8');
const files = fs.readdirSync(dist, { recursive: true }).filter(file => file.endsWith('.html') && file !== '404.html');
const errors = [];
let checked = 0;

function htmlFile(pathname) {
  const relative = pathname.replace(/^\//, '').replace(/\/$/, '');
  for (const file of [relative || 'index.html', `${relative}.html`, `${relative}/index.html`]) {
    if (fs.existsSync(path.join(dist, file)) && fs.statSync(path.join(dist, file)).isFile()) return file;
  }
  return '';
}

for (const file of files) {
  const tree = parse(fs.readFileSync(path.join(dist, file), 'utf8'));
  const links = [];
  const scripts = [];
  let bodyLocation = '';
  function walk(node) {
    const attrs = Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
    if (node.tagName === 'body') bodyLocation = attrs['data-location'] || '';
    if (node.tagName === 'a' && attrs.href && !('download' in attrs) && !('data-language-suggestion-link' in attrs)) links.push(attrs);
    if (node.tagName === 'script' && !attrs.src) {
      const content = (node.childNodes || []).map(child => child.value || '').join('');
      if (content.includes('window.__TM_SITE_CONTRACT__ =') || content.includes('window.__TM_SITE_PROFILE__ =')) scripts.push(content);
    }
    (node.childNodes || []).forEach(walk);
  }
  walk(tree);
  const document = { body: { dataset: { location: bodyLocation } }, readyState: 'complete', querySelectorAll: () => [], addEventListener() {} };
  const window = { document, addEventListener() {} };
  const context = vm.createContext({ window, document, URL, URLSearchParams });
  scripts.forEach(script => vm.runInContext(script, context));
  if (!window.__TM_SITE_CONTRACT__) continue;
  const profile = window.__TM_SITE_PROFILE__;
  const pathname = file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '');
  window.location = { origin: profile.origin, pathname, href: profile.origin + pathname };
  const contract = window.__TM_SITE_CONTRACT__;
  const localVenues = contract.locationIds.filter(slug => !contract.externalLocationIds.includes(slug));
  vm.runInContext(runtime, context);
  const nav = window.TMNavigation;
  const locale = nav.pathContext(pathname).locale;
  for (const venue of localVenues) {
    window.TM = { current: { slug: bodyLocation || nav.pathLocation(pathname) || venue } };
    for (const attrs of links) {
      const raw = attrs.href;
      if (/^(#|mailto:|tel:|javascript:|data:)/i.test(raw)) continue;
      const output = nav.href(raw, { scope: !('data-tm-no-location-scope' in attrs), location: attrs['data-tm-location'] });
      const url = new URL(output, window.location.href);
      if (url.origin !== profile.origin || /\.(?!html$)[a-z0-9]+$/i.test(url.pathname) || url.pathname.startsWith('/api/')) continue;
      checked++;
      // Validate the actual public URL. A Worker rewrite is not a static fallback.
      if (!htmlFile(url.pathname)) errors.push(`${file} [${venue}]: ${raw} -> ${output} has no static HTML artifact (${url.pathname})`);
      if (nav.pathContext(url.pathname).locale !== locale) errors.push(`${file}: ${raw} -> ${output} loses ${locale}`);
      const sourcePath = nav.pathContext(new URL(raw, window.location.href).pathname).path;
      if (!nav.pathLocation(url.pathname) && !('data-tm-no-location-scope' in attrs) && sourcePath !== '/group-form-thank-you/jotform') {
        errors.push(`${file} [${venue}]: ${raw} -> ${output} loses venue`);
      }
    }
  }
}
const uniqueErrors = [...new Set(errors)];
if (uniqueErrors.length) {
  console.error(uniqueErrors.slice(0, 40).join('\n'));
  console.error(`${uniqueErrors.length} navigation failures`);
  process.exit(1);
}
console.log(`Navigation output: ${files.length} HTML pages, ${checked} internal link/venue combinations passed.`);
