import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('CMS landing templates', () => {
  it('keeps the Payload collection options aligned with the database migration', () => {
    const collection = read('cms/collections/Landings.js');
    const migration = read('cms/migrations/20260508_213000_landing_templates.ts');

    for (const template of ['paid_social_campaign', 'local_venue_city', 'group_event']) {
      expect(collection).toContain(`value: '${template}'`);
      expect(migration).toContain(`'${template}'`);
    }

    for (const template of ['campaign', 'location_promo', 'coming_soon']) {
      expect(collection).toContain(`legacyValue: '${template}'`);
      expect(migration).toContain(`'${template}'`);
    }

    for (const guidance of [
      'Ad or social campaign',
      'Local venue or city campaign',
      'Group or event landing',
    ]) {
      expect(collection).toContain(guidance);
    }

    expect(collection).toContain('preview: landingPreviewPath');
    expect(migration).toContain('ALTER TABLE "landings" ADD COLUMN "template"');
  });

  it('requires an authenticated Payload user for CMS preview pages', () => {
    const previewRoute = read('cms/app/preview/landings/[id]/page.tsx');

    expect(previewRoute).toContain('payload.auth');
    expect(previewRoute).toContain('overrideAccess: false');
    expect(previewRoute).toContain('/admin/login?redirect=');
    expect(previewRoute).toContain('Public path');
    expect(previewRoute).toContain('Sitemap');
    expect(previewRoute).toContain('Review warnings');
    expect(previewRoute).toContain('landingReviewWarningsForDoc');
  });
});
