'use strict';

const fs = require('node:fs');
const path = require('node:path');

function decodeBasicEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractFirst(html, re) {
  const m = String(html || '').match(re);
  return m ? decodeBasicEntities(m[1].trim()) : null;
}

function extractHeadMetadata(html) {
  return {
    title: extractFirst(html, /<title>([^<]*)<\/title>/i),
    description: extractFirst(html, /<meta\s+name="description"\s+content="([^"]*)"/i),
    author: extractFirst(html, /<meta\s+name="author"\s+content="([^"]*)"/i),
    designer: extractFirst(html, /<meta\s+name="designer"\s+content="([^"]*)"/i),
    developer: extractFirst(html, /<meta\s+name="developer"\s+content="([^"]*)"/i),
    canonical: extractFirst(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i),
    ogUrl: extractFirst(html, /<meta\s+property="og:url"\s+content="([^"]+)"/i),
    ogImage: extractFirst(html, /<meta\s+property="og:image"\s+content="([^"]+)"/i),
    twitterImage: extractFirst(html, /<meta\s+name="twitter:image"\s+content="([^"]+)"/i),
    robots: extractFirst(html, /<meta\s+name="robots"\s+content="([^"]+)"/i),
  };
}

function extractLdScripts(html) {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  return [...String(html || '').matchAll(re)].map((m) => m[1].trim());
}

function graphNodes(graph) {
  if (!graph || graph['@context'] !== 'https://schema.org') return [];
  if (Array.isArray(graph['@graph'])) return graph['@graph'];
  return graph['@type'] ? [graph] : [];
}

function typesInGraph(graph) {
  const nodes = graphNodes(graph);
  if (!nodes.length || !Array.isArray(graph && graph['@graph'])) {
    return { ok: false, types: [] };
  }
  return {
    ok: true,
    types: nodes.filter((node) => node && node['@type']).map((node) => node['@type']),
  };
}

function findNodesByType(graph, type) {
  return graphNodes(graph).filter((node) => node && node['@type'] === type);
}

function findJsonLdNodes(html, type) {
  const out = [];
  for (const block of extractLdScripts(html)) {
    if (type && !block.includes(type)) continue;
    let data;
    try {
      data = JSON.parse(block);
    } catch {
      continue;
    }
    if (type) out.push(...findNodesByType(data, type));
    else out.push(...graphNodes(data));
  }
  return out;
}

function readDistRouteHtml(root, route) {
  const outFile = route.outputFile.replace(/^\//, '');
  const absHtml = path.join(root, 'dist', outFile);
  return {
    outFile,
    absHtml,
    exists: fs.existsSync(absHtml),
    html: fs.existsSync(absHtml) ? fs.readFileSync(absHtml, 'utf8') : '',
  };
}

module.exports = {
  decodeBasicEntities,
  extractFirst,
  extractHeadMetadata,
  extractLdScripts,
  graphNodes,
  typesInGraph,
  findNodesByType,
  findJsonLdNodes,
  readDistRouteHtml,
};
