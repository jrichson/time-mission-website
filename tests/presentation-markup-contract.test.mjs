import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (/\.(astro|frag\.txt)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('presentation markup contract', () => {
  it('keeps shared markup free of inline style attributes', () => {
    const files = [
      ...walk(path.join(root, 'src/components')),
      ...walk(path.join(root, 'src/layouts')),
      ...walk(path.join(root, 'src/partials')),
    ];
    const offenders = files.flatMap((file) => {
      const rel = path.relative(root, file);
      return fs.readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /\sstyle="/.test(line))
        .map(({ index }) => `${rel}:${index + 1}`);
    });

    expect(offenders).toEqual([]);
  });

  it('keeps star ratings exposed as accessible rating text', () => {
    const files = walk(path.join(root, 'src/partials'));
    const offenders = files.flatMap((file) => {
      const rel = path.relative(root, file);
      return fs.readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /class="(?:group-)?testimonial-rating"/.test(line) && !/aria-label="5 out of 5 stars"/.test(line))
        .map(({ index }) => `${rel}:${index + 1}`);
    });

    expect(offenders).toEqual([]);
  });
});
