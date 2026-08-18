import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import routeArtifacts from '../scripts/lib/route-artifacts.js';

const { resolveInternalDeployTarget } = routeArtifacts;
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
      '/boston https://www.timemission.com/boston 301\n',
    );

    expect(resolveInternalDeployTarget(root, registry, '/boston')).toBe(redirectsPath);
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
});
