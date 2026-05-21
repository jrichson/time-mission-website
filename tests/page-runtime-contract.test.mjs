import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { inspectPageRuntime } from '../scripts/lib/page-runtime-policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

describe('page-widgets runtime contract', () => {
  it('keeps the TMPage entry points stable', () => {
    const runtime = fs.readFileSync(path.join(root, 'js/page-widgets.js'), 'utf8');

    expect(inspectPageRuntime(runtime)).toEqual([]);
  });
});
