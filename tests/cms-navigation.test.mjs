import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('CMS navigation', () => {
  it('keeps Mission Control reachable from custom workflow pages and Payload chrome', () => {
    expect(read('cms/components/TimeMissionLogo.tsx')).toContain('href="/" aria-label="Mission Control"');
    expect(read('cms/app/page.tsx')).toContain('Mission Control');
    expect(read('cms/app/page.tsx')).toContain('Run the CMS from here.');
    expect(read('cms/components/LandingWizardDashboard.tsx')).toContain("href: '/deploy'");
    expect(read('cms/components/LandingWizardDashboard.tsx')).toContain('Deploy approved changes');
    expect(read('cms/components/LandingWizardDashboard.tsx')).toContain('owner-granted deploy permissions');
    expect(read('cms/components/LandingWizardDashboard.tsx')).toContain('Mission Control is the main CMS home.');
    expect(read('cms/app/deploy/page.tsx')).toContain('<Link href="/">Mission Control</Link>');
    expect(read('cms/app/landings/new/page.tsx')).toContain('<Link href="/">Mission Control</Link>');
    expect(read('cms/app/preview/landings/[id]/page.tsx')).toContain('Mission Control');
  });
});
