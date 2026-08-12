import * as parse5 from 'parse5';

const USER_FACING_ATTRIBUTES = new Set(['alt', 'aria-label', 'label', 'placeholder', 'title']);
const TRANSLATED_META = new Set([
  'description',
  'og:title',
  'og:description',
  'twitter:title',
  'twitter:description',
]);
const SKIPPED_ELEMENTS = new Set(['script', 'style', 'svg', 'noscript', 'template']);

function attributesFor(node) {
  return Object.fromEntries((node.attrs || []).map((attribute) => [attribute.name, attribute.value]));
}

function hasClass(attributes, className) {
  return String(attributes.class || '').split(/\s+/).includes(className);
}

function skipsPageCopy(node, attributes) {
  if (SKIPPED_ELEMENTS.has(node.tagName)) return true;
  if (
    Object.hasOwn(attributes, 'data-i18n')
    || Object.hasOwn(attributes, 'data-i18n-html')
    || Object.keys(attributes).some((name) => name.startsWith('data-i18n-'))
  ) {
    return true;
  }
  if (attributes['data-page-i18n'] === 'ignore') return true;
  if (hasClass(attributes, 'newsletter-section')) return true;
  if (attributes['data-tm-form'] === 'newsletter') return true;
  return node.tagName === 'input' && attributes.type === 'hidden';
}

export function normalizePageCopy(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function pageTranslationsFor(catalog, locale, canonicalPath = '') {
  return {
    ...(catalog?.translations?.[locale] || {}),
    ...(catalog?.routes?.[canonicalPath]?.[locale] || {}),
  };
}

export function preservedSourceTermsFor(catalog, locale) {
  const missionNames = catalog?._policy?.missionNames || [];
  return new Set([
    ...missionNames,
    ...missionNames.map((name) => String(name).toUpperCase()),
    ...(catalog?._policy?.preservedSourceTerms?.common || []),
    ...(catalog?._policy?.preservedSourceTerms?.[locale] || []),
  ]);
}

export function effectivePageTranslation(translations, preservedSourceTerms, source) {
  return preservedSourceTerms.has(source) ? source : translations[source];
}

function isTranslatableCopy(value) {
  return /[A-Za-zÀ-ž]/u.test(value);
}

function metaCopyAttribute(node, attributes) {
  if (node.tagName !== 'meta') return '';
  const key = String(attributes.name || attributes.property || '').toLowerCase();
  return TRANSLATED_META.has(key) ? 'content' : '';
}

function walkPageCopy(node, visitor, state = {}) {
  const attributes = attributesFor(node);
  const inMain = state.inMain || node.tagName === 'main';
  const inTitle = state.inTitle || node.tagName === 'title';
  const skipped = state.skipped || skipsPageCopy(node, attributes);

  if (!skipped && node.nodeName === '#text' && (inMain || inTitle)) {
    const value = normalizePageCopy(node.value);
    if (value && isTranslatableCopy(value)) visitor.text(node, value);
  }

  if (!skipped && node.tagName) {
    const attributeNames = inMain
      ? [...USER_FACING_ATTRIBUTES]
      : [metaCopyAttribute(node, attributes)].filter(Boolean);
    for (const name of attributeNames) {
      const value = normalizePageCopy(attributes[name]);
      if (value && isTranslatableCopy(value)) visitor.attribute(node, name, value);
    }
  }

  for (const child of node.childNodes || []) {
    walkPageCopy(child, visitor, { inMain, inTitle, skipped });
  }
}

function parseDocument(html, sourceCodeLocationInfo = false) {
  return parse5.parse(String(html || ''), { sourceCodeLocationInfo });
}

export function collectPageCopyEntries(html) {
  const entries = [];
  walkPageCopy(parseDocument(html), {
    text(_node, value) {
      entries.push({ kind: 'text', value });
    },
    attribute(_node, name, value) {
      entries.push({ kind: `attribute:${name}`, value });
    },
  });
  return entries;
}

export function collectPageCopyKeys(html) {
  return [...new Set(collectPageCopyEntries(html).map((entry) => entry.value))].sort();
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textReplacement(source, node, translated) {
  const raw = source.slice(node.sourceCodeLocation.startOffset, node.sourceCodeLocation.endOffset);
  const leading = /^\s/u.test(String(node.value || '')) ? raw.match(/^\s*/u)?.[0] || ' ' : '';
  const trailing = /\s$/u.test(String(node.value || '')) ? raw.match(/\s*$/u)?.[0] || ' ' : '';
  return `${leading}${htmlEscape(translated)}${trailing}`;
}

function attributeReplacement(source, node, name, translated) {
  const location = node.sourceCodeLocation?.attrs?.[name];
  if (!location) return null;
  const raw = source.slice(location.startOffset, location.endOffset);
  const originalName = raw.match(/^\s*([^=\s]+)/u)?.[1] || name;
  return {
    startOffset: location.startOffset,
    endOffset: location.endOffset,
    value: `${originalName}="${htmlEscape(translated)}"`,
  };
}

export function localizePageCopy(html, locale, catalog, canonicalPath = '') {
  const translations = pageTranslationsFor(catalog, locale, canonicalPath);
  if (!Object.keys(translations).length) return html;

  const source = String(html || '');
  const preservedSourceTerms = preservedSourceTermsFor(catalog, locale);
  const replacements = [];
  walkPageCopy(parseDocument(source, true), {
    text(node, value) {
      const translated = effectivePageTranslation(translations, preservedSourceTerms, value);
      if (typeof translated !== 'string' || translated === value || !node.sourceCodeLocation) return;
      replacements.push({
        startOffset: node.sourceCodeLocation.startOffset,
        endOffset: node.sourceCodeLocation.endOffset,
        value: textReplacement(source, node, translated),
      });
    },
    attribute(node, name, value) {
      const translated = effectivePageTranslation(translations, preservedSourceTerms, value);
      if (typeof translated !== 'string' || translated === value) return;
      const replacement = attributeReplacement(source, node, name, translated);
      if (replacement) replacements.push(replacement);
    },
  });

  let localized = source;
  for (const replacement of replacements.sort((a, b) => b.startOffset - a.startOffset)) {
    localized = localized.slice(0, replacement.startOffset)
      + replacement.value
      + localized.slice(replacement.endOffset);
  }
  return localized;
}
