import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  approvalRecord,
  artifactLanguageDigest,
  extractLanguageSurfaceCopy,
  unchangedLocalizedFields,
} from '../scripts/lib/i18n-artifact-approval.mjs';

const roots = [];
const profile = {
  id: 'eu',
  origin: 'https://www.timemission.eu',
  counterpartOrigin: 'https://www.timemission.com',
  locales: ['en', 'nl'],
  defaultLocale: 'en',
  localizedRoutes: true,
};
const routes = [{ canonicalPath: '/', outputFile: 'index.html' }];

function tempDist() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-i18n-artifact-test-'));
  roots.push(root);
  return root;
}

function page({ title, description, heading, canonical }) {
  return `<!doctype html><html><head><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"></head><body><h1>${heading}</h1><p>Body copy</p><script>ignored()</script></body></html>`;
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('Language Surface artifact approval', () => {
  it('changes the digest when rendered locale copy changes', () => {
    const dist = tempDist();
    fs.mkdirSync(path.join(dist, 'nl'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'index.html'), page({
      title: 'Time Mission Experiences',
      description: 'English description for the public home page.',
      heading: 'Immersive adventures',
      canonical: 'https://www.timemission.eu/',
    }));
    fs.writeFileSync(path.join(dist, 'nl/index.html'), page({
      title: 'Time Mission Ervaringen',
      description: 'Nederlandse beschrijving voor de openbare homepage.',
      heading: 'Meeslepende avonturen',
      canonical: 'https://www.timemission.eu/nl',
    }));

    const before = artifactLanguageDigest(dist, profile, 'nl', routes);
    fs.writeFileSync(path.join(dist, 'nl/index.html'), page({
      title: 'Time Mission Activiteiten',
      description: 'Nederlandse beschrijving voor de openbare homepage.',
      heading: 'Meeslepende avonturen',
      canonical: 'https://www.timemission.eu/nl',
    }));
    const after = artifactLanguageDigest(dist, profile, 'nl', routes);

    expect(after).not.toBe(before);
  });

  it('detects unchanged translated metadata and headings', () => {
    const html = page({
      title: 'Privacy Policy | Time Mission',
      description: 'This privacy description should not remain English on a locale page.',
      heading: 'Privacy Policy',
      canonical: 'https://www.timemission.eu/privacy',
    });
    const copy = extractLanguageSurfaceCopy(html);
    expect(unchangedLocalizedFields(copy, copy)).toEqual(['title', 'description', 'heading']);
  });

  it('keeps unchanged-field launch approval explicit and artifact-scoped', () => {
    expect(approvalRecord({
      status: 'approved',
      artifactDigest: 'abc123',
      reviewer: 'Site Owner',
      reviewedAt: '2026-07-31T00:00:00.000Z',
      allowUnchangedFields: true,
      approvalNote: 'Approved for launch.',
    })).toMatchObject({
      status: 'approved',
      artifactDigest: 'abc123',
      allowUnchangedFields: true,
      approvalNote: 'Approved for launch.',
    });

    expect(approvalRecord('approved')).toMatchObject({
      status: 'approved',
      artifactDigest: '',
      allowUnchangedFields: false,
    });
  });
});
