import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'cms', 'migrations');

function interpolatedExecuteBlocks(source) {
  return [...source.matchAll(/db\.execute\(sql`([\s\S]*?)`\)/g)]
    .map((match) => match[1])
    .filter((sqlBody) => sqlBody.includes('${'));
}

describe('CMS migration execution', () => {
  it('keeps parameterized SQL templates to one command per prepared statement', () => {
    const violations = [];
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
      .sort();

    for (const file of migrationFiles) {
      const source = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      for (const sqlBody of interpolatedExecuteBlocks(source)) {
        const statementCount = (sqlBody.match(/;/g) || []).length;
        if (statementCount > 1) {
          violations.push(`${file}: ${statementCount} commands in one parameterized db.execute`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
