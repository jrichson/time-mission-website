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
    expect(read('cms/app/page.tsx')).toContain('What do you need to update?');
    expect(read('cms/app/page.tsx')).toContain('Common jobs');
    expect(read('cms/app/page.tsx')).toContain('Use the shortest path');
    expect(read('cms/components/LandingWizardDashboard.tsx')).toContain('Back to Mission Control');
    expect(read('cms/components/LandingWizardDashboard.tsx')).toContain('Use this bridge only for landing-page work.');
    expect(read('cms/components/LandingWizardDashboard.tsx')).not.toContain('Payload shortcuts');
    expect(read('cms/app/deploy/page.tsx')).toContain('<Link href="/">Back to Mission Control</Link>');
    expect(read('cms/app/deploy/page.tsx')).toContain('aria-label="Breadcrumb"');
    expect(read('cms/app/deploy/page.tsx')).toContain('Deploy request sent');
    expect(read('cms/app/deploy/page.tsx')).toContain('Open public site');
    expect(read('cms/app/landings/new/page.tsx')).toContain('<Link href="/">Back to Mission Control</Link>');
    expect(read('cms/app/landings/new/page.tsx')).toContain('aria-label="Breadcrumb"');
    expect(read('cms/app/preview/landings/[id]/page.tsx')).toContain('Back to Mission Control');
    expect(read('cms/app/preview/landings/[id]/page.tsx')).toContain('Open public URL');
    expect(read('cms/app/preview/landings/[id]/page.tsx')).toContain('Draft saved');
  });

  it('keeps the raw Payload dashboard out of the primary CMS workflow', () => {
    const missionControl = read('cms/app/page.tsx');
    const workflowPages = [
      missionControl,
      read('cms/app/deploy/page.tsx'),
      read('cms/app/landings/new/page.tsx'),
    ];
    const proxy = read('cms/proxy.ts');

    expect(workflowPages.join('\n')).not.toContain('href="/admin"');
    expect(missionControl).not.toContain('Payload Admin Tools');
    expect(missionControl).not.toContain('raw Payload dashboard');
    expect(missionControl).not.toContain('drop into Payload');
    expect(missionControl).toContain('Less common work');
    expect(missionControl).toContain('/locations/bulk');
    expect(proxy).toContain('export function proxy');
    expect(proxy).toContain("matcher: ['/admin/:path*']");
    expect(proxy).toContain("collection === 'blog-posts'");
    expect(proxy).toContain("destination = '/announcements'");
  });
});
