import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Payload public landing renderer', () => {
  it('renders distinct archetype paths while preserving analytics hooks', () => {
    const renderer = read('src/pages/c/[slug].astro');

    for (const marker of [
      'landingArchetypeForDoc',
      'landingLaunchStateForDoc',
      'tm-landing-main--paid_social_campaign',
      'tm-landing-main--local_venue_city',
      'tm-landing-main--group_event',
      'data-tm-landing-primary',
      'data-link-path={cta.linkPath}',
    ]) {
      expect(renderer).toContain(marker);
    }
  });
});
