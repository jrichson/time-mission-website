import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('press releases page', () => {
  it('publishes the Boston announcement instead of the empty state', () => {
    const markup = fs.readFileSync(
      path.join(root, 'src/partials/press-releases-main.frag.txt'),
      'utf8',
    );

    expect(markup).toContain('Boston Announcement');
    expect(markup).toContain('Time Mission Is Coming to Boston');
    expect(markup).toContain('Time Mission Boston is coming soon at 200 State St, Boston, MA 02109.');
    expect(markup).toContain('href="/boston"');
    expect(markup).toContain('200 State St, Boston, MA 02109');
    expect(markup).not.toContain('No public releases yet');
  });
});
