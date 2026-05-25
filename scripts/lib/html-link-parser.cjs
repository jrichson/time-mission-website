'use strict';

function parseAttributes(tag) {
  const attrs = {};
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(["'])(.*?)\2)?/g;
  for (const match of String(tag || '').matchAll(attrRe)) {
    const name = match[1].toLowerCase();
    if (name === 'link') continue;
    attrs[name] = match[3] === undefined ? true : match[3];
  }
  return attrs;
}

function pathnameForHref(href) {
  try {
    return new URL(href, 'https://timemission.local').pathname;
  } catch {
    return '';
  }
}

function stylesheetLinks(html) {
  const links = [];
  const linkRe = /<link\b[^>]*>/gi;
  let match;
  while ((match = linkRe.exec(String(html || ''))) !== null) {
    const tag = match[0];
    const attrs = parseAttributes(tag);
    const rel = String(attrs.rel || '').toLowerCase().split(/\s+/);
    if (!rel.includes('stylesheet') || !attrs.href) continue;
    links.push({
      tag,
      href: String(attrs.href),
      pathname: pathnameForHref(String(attrs.href)),
      start: match.index,
      end: match.index + tag.length,
    });
  }
  return links;
}

module.exports = {
  stylesheetLinks,
};
