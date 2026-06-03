'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { findJsonLdNodes } = require('./lib/rendered-page-contract');

const root = path.resolve(__dirname, '..');
const errors = [];

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').replace(/\s+([,.:;!?])/g, '$1').trim();
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function renderedText(value) {
  return decodeHtmlEntities(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function wordCount(value) {
  return normalize(value).split(/\s+/).filter(Boolean).length;
}

function requireFile(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing ${rel} — run npm run build:astro first`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

const geo = loadJson('src/data/site/geo-answer-blocks.json');
const registry = loadJson('src/data/routes.json');
const requiredKeys = ['whatIsTimeMission', 'missions', 'groups', 'locations', 'faq'];
const allBlocks = Object.entries(geo.blocks || {});

for (const key of requiredKeys) {
  if (!geo.blocks || !geo.blocks[key]) {
    errors.push(`geo-answer-blocks.json missing required block "${key}"`);
  }
}

for (const [key, block] of allBlocks) {
  if (!block || typeof block.heading !== 'string' || !block.heading.trim()) {
    errors.push(`${key}: heading must be a non-empty string`);
  }
  if (!block || typeof block.publicPath !== 'string' || !block.publicPath.startsWith('/')) {
    errors.push(`${key}: publicPath must be an absolute public path`);
  }
  if (!block || typeof block.text !== 'string' || !block.text.trim()) {
    errors.push(`${key}: text must be a non-empty string`);
    continue;
  }
  const words = wordCount(block.text);
  if (words < 134 || words > 167) {
    errors.push(`${key}: expected 134-167 words, found ${words}`);
  }
}

const routeByCanonical = new Map((registry.routes || []).map((route) => [route.canonicalPath, route]));
const publicBlocks = requiredKeys.map((key) => [key, geo.blocks[key]]).filter(([, block]) => block);

for (const [key, block] of publicBlocks) {
  const route = routeByCanonical.get(block.publicPath);
  if (!route) {
    errors.push(`${key}: publicPath ${block.publicPath} is not a registered public route`);
    continue;
  }
  const rel = route.outputFile.replace(/^\//, '');
  const body = requireFile(path.join('dist', rel));
  if (!body) continue;
  const normalizedBody = normalize(renderedText(body));
  if (!normalizedBody.toLowerCase().includes(normalize(block.heading).toLowerCase())) {
    errors.push(`${rel}: missing visible GEO heading for ${key}`);
  }
  if (!normalizedBody.includes(normalize(block.text))) {
    errors.push(`${rel}: missing visible GEO answer block for ${key}`);
  }
}

for (const rel of ['dist/llms.txt', 'dist/llms-full.txt', 'dist/ai-context.md']) {
  const body = requireFile(rel);
  if (!body) continue;
  const normalizedBody = normalize(body);
  for (const [key, block] of allBlocks) {
    if (!normalizedBody.includes(normalize(block.heading))) {
      errors.push(`${rel}: missing shared GEO heading for ${key}`);
    }
    if (!normalizedBody.includes(normalize(block.text))) {
      errors.push(`${rel}: missing shared GEO answer block for ${key}`);
    }
  }
}

const imageExpectations = [
  {
    rel: 'dist/index.html',
    id: 'https://www.timemission.com/#primaryimage',
        url: 'https://www.timemission.com/assets/photos/experiences/ready-to-play.jpg',
  },
  {
    rel: 'dist/missions.html',
    id: 'https://www.timemission.com/missions#primaryimage',
    url: 'https://www.timemission.com/assets/photos/experiences/experiences-hero.jpg',
  },
  {
    rel: 'dist/groups.html',
    id: 'https://www.timemission.com/groups#primaryimage',
    url: 'https://www.timemission.com/assets/video/groups-hero-poster.jpg',
  },
];

for (const expected of imageExpectations) {
  const body = requireFile(expected.rel);
  if (!body) continue;
  const images = findJsonLdNodes(body, 'ImageObject');
  const match = images.find((node) => node['@id'] === expected.id && node.url === expected.url);
  if (!match) {
    errors.push(`${expected.rel}: missing ImageObject ${expected.id}`);
  }
}

if (errors.length) {
  console.error('GEO answer block check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`GEO answer block check passed for ${publicBlocks.length} public blocks and ${imageExpectations.length} media nodes.`);
