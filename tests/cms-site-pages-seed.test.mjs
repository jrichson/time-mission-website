import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

describe('CMS existing-page seed migration', () => {
  it('covers every route registry canonical path', () => {
    const routes = JSON.parse(fs.readFileSync(path.join(root, 'src/data/routes.json'), 'utf8')).routes;
    const migration = fs.readFileSync(
      path.join(root, 'cms/migrations/20260508_201500_seed_site_pages.ts'),
      'utf8',
    );

    for (const route of routes) {
      expect(migration).toContain(`'${route.canonicalPath}'`);
    }
  });

  it('does not overwrite CMS edits when rows already exist', () => {
    const migration = fs.readFileSync(
      path.join(root, 'cms/migrations/20260508_201500_seed_site_pages.ts'),
      'utf8',
    );

    expect(migration).toContain('ON CONFLICT ("path") DO NOTHING');
  });
});
