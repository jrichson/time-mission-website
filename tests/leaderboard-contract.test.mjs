import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
describe('public leaderboard contract', () => {
  it('ships venue selection and truthful columns without demonstration data', () => {
    const component = read('src/components/Leaderboard.astro');
    expect(component).toContain('data-leaderboard-location');
    expect(component).not.toMatch(/data-period|lb-col-missions|role="tab"/);
    expect(fs.existsSync(new URL('../data/leaderboard.json', import.meta.url))).toBe(false);
    expect(read('js/leaderboard.js')).toContain('/api/leaderboard');
    expect(read('js/leaderboard.js')).not.toContain('innerHTML');
  });
});

describe('leaderboard metadata correction', () => {
  it('only replaces the original unsupported description and preserves editor changes on rollback', () => {
    const migration = read('cms/migrations/20261106_090000_leaderboard_description.ts');
    expect(migration).toContain('WHERE "path" = ${page.path} AND "seo_meta_description" = ${previous.metaDescription}');
    expect(migration.split('export async function down')[1]).toContain('SELECT 1;');
    expect(read('cms/migrations/index.ts')).toContain("name: '20261106_090000_leaderboard_description'");
  });
});
