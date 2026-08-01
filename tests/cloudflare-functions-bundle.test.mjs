import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { build } from 'esbuild';
import { afterEach, describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const tempRoots = [];

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }
});

describe('Cloudflare Pages Functions bundle', () => {
  it('resolves every runtime module from the isolated Functions tree', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-functions-bundle-'));
    tempRoots.push(tempRoot);
    fs.cpSync(path.join(root, 'functions'), path.join(tempRoot, 'functions'), {
      recursive: true,
    });

    const result = await build({
      absWorkingDir: tempRoot,
      bundle: true,
      entryPoints: [
        'functions/[[path]].js',
        'functions/api/contact.js',
        'functions/api/newsletter.js',
      ],
      format: 'esm',
      metafile: true,
      outdir: 'out',
      platform: 'browser',
      write: false,
    });

    expect(result.errors).toEqual([]);
    expect(Object.keys(result.metafile.inputs)).toEqual(
      expect.arrayContaining([
        'functions/_shared/contact-routing-policy.mjs',
        'functions/_shared/form-handler.mjs',
      ]),
    );
    expect(Object.keys(result.metafile.inputs).every((input) => input.startsWith('functions/')))
      .toBe(true);
  }, 15_000);
});
