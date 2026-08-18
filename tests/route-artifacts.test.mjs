import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import routeArtifacts from '../scripts/lib/route-artifacts.js';

const { resolveInternalDeployTarget, verifySitemapLocs } = routeArtifacts;
const roots = [];

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-route-artifacts-test-'));
  roots.push(root);
  return root;
}

function write(root, relative, content) {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return absolute;
}

const registry = {
  baseUrl: 'https://www.timemission.com',
  routes: [{ canonicalPath: '/boston', outputFile: 'boston.html' }],
};

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('route artifact resolution', () => {
  it('accepts an exact regional redirect when a built page is intentionally absent', () => {
    const root = tempRoot();
    const redirectsPath = write(
      root,
      '_redirects',
      '/boston https://www.timemission.com/boston 301\n/es/boston https://www.timemission.com/boston 301\n',
    );

    expect(resolveInternalDeployTarget(root, registry, '/boston')).toBe(redirectsPath);
    expect(resolveInternalDeployTarget(root, registry, '/es/boston')).toBe(redirectsPath);
  });

  it('does not accept comments, wildcard sources, or unrelated redirects', () => {
    const root = tempRoot();
    write(
      root,
      '_redirects',
      '# /boston https://www.timemission.com/boston 301\n/boston/* https://www.timemission.com/boston 301\n/philadelphia https://www.timemission.com/philadelphia 301\n',
    );

    expect(resolveInternalDeployTarget(root, registry, '/boston')).toBeNull();
  });

  it('does not let a source-tree redirect hide a missing registered Astro source', () => {
    const root = tempRoot();
    write(
      root,
      'src/data/site/astro-rendered-output-files.json',
      `${JSON.stringify({ outputFiles: ['boston.html'] })}\n`,
    );
    write(root, '_redirects', '/boston https://www.timemission.com/boston 301\n');

    expect(resolveInternalDeployTarget(root, registry, '/boston')).toBeNull();
  });
});

describe('dynamic sitemap URL validation', () => {
  const contract = {
    baseUrl: 'https://www.timemission.com',
    defaultLocale: 'en',
    locales: ['en', 'es'],
    registry: {
      baseUrl: 'https://www.timemission.com',
      routes: [],
      _meta: { dynamicLandingPrefix: '/c' },
    },
    rootHome: 'https://www.timemission.com/',
    sitemapUrls: [],
    sitemapUrlSet: new Set(),
  };

  it('accepts localized blog indexes, blog entries, and landing pages', () => {
    const locs = [
      'https://www.timemission.com/blog',
      'https://www.timemission.com/blog/boston-announcement',
      'https://www.timemission.com/es/blog',
      'https://www.timemission.com/es/blog/boston-announcement',
      'https://www.timemission.com/c/summer-adventures',
      'https://www.timemission.com/es/c/summer-adventures',
    ];

    expect(verifySitemapLocs(locs, contract, { requireBaseUrl: true }).errors).toEqual([]);
  });

  it('rejects unsupported locales and nested dynamic slugs', () => {
    const locs = [
      'https://www.timemission.com/fr/blog/boston-announcement',
      'https://www.timemission.com/es/blog/boston/announcement',
      'https://www.timemission.com/es/c/summer/adventures',
    ];

    expect(verifySitemapLocs(locs, contract, { requireBaseUrl: true }).errors).toEqual([
      'Unexpected sitemap URL: https://www.timemission.com/fr/blog/boston-announcement',
      'Unexpected sitemap URL: https://www.timemission.com/es/blog/boston/announcement',
      'Unexpected sitemap URL: https://www.timemission.com/es/c/summer/adventures',
    ]);
  });
});
