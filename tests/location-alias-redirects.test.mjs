import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { LOCATION_ROUTE_ENTRIES } from '../functions/_shared/location-route-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'src/data/routes.json'), 'utf8'));
const redirectRows = new Map(
  fs.readFileSync(path.join(root, '_redirects'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/))
    .map(([source, target]) => [source, target]),
);

// Static _redirects is the only thing that serves location aliases (Workers only run for /api).
const locationTargets = new Set(
  LOCATION_ROUTE_ENTRIES.map((entry) => (entry.externalUrl
    ? entry.externalUrl.replace('https://www.timemission.eu', 'https://timemission.eu')
    : entry.canonicalPath)),
);
const locationAliases = registry.aliases.filter((alias) => (
  locationTargets.has(alias.target) && !alias.source.slice(1).includes('/')
));

describe('location alias redirects', () => {
  it('finds the location aliases', () => {
    expect(locationAliases.map((alias) => alias.source)).toEqual(
      expect.arrayContaining(['/orlandpark', '/mountprospect', '/westnyack', '/philly', '/terminal1']),
    );
  });

  it.each(locationAliases)('$source also redirects with a trailing slash and for pages under it', ({ source, target }) => {
    expect(redirectRows.get(source)).toBe(target);
    expect(redirectRows.get(`${source}/`)).toBe(target);
    expect(redirectRows.get(`${source}/*`)).toBe(`${target}/:splat`);
  });
});
