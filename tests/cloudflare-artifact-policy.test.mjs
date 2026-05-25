import { describe, expect, it } from 'vitest';
import {
  OFFLOADED_MP4_FILES,
  VERIFY_STEPS,
  VERIFY_SUCCESS_MESSAGE,
  formatNpmStep,
  isFinderDuplicateName,
  planRequiredArtifacts,
  planVideoArtifacts,
  resolveNpmStep,
  shouldExcludeArtifactPath,
} from '../scripts/lib/cloudflare-artifact-policy.mjs';

describe('Cloudflare Artifact policy', () => {
  it('plans required files and directories for the Pages artifact', () => {
    expect(planRequiredArtifacts()).toMatchObject({
      rootFiles: expect.arrayContaining(['_headers.tmpl', '_redirects', 'robots.txt']),
      assetDirs: expect.arrayContaining(['assets', 'css', 'js', 'data']),
      requiredDataFiles: ['data/locations.json'],
    });
  });

  it('owns the verify pipeline order used for Pages readiness', () => {
    expect(VERIFY_STEPS[0][0]).toBe('check');
    expect(VERIFY_STEPS[1][0]).toBe('build:astro');
    expect(VERIFY_STEPS.at(-1)[0]).toBe('test:smoke');
    expect(formatNpmStep(VERIFY_STEPS[0])).toBe('npm run check');
    expect(resolveNpmStep(VERIFY_STEPS[0], 'win32')).toEqual({
      command: 'npm.cmd',
      args: ['run', 'check'],
    });
    expect(VERIFY_SUCCESS_MESSAGE).toBe('verify-site-output.mjs: all steps passed.');
  });

  it('keeps large MP4 files out of the Pages bundle when media is hosted externally', () => {
    expect(planVideoArtifacts({ mediaBase: 'https://media.timemission.com' })).toMatchObject({
      hostedExternally: true,
      removeFromBundle: OFFLOADED_MP4_FILES,
      requiredInBundle: [],
      missingFromBundle: [],
    });
  });

  it('requires bundled MP4 files when no external media base is configured', () => {
    expect(planVideoArtifacts({ availableFiles: ['TM-Hero-bg-web-hero.mp4'] })).toMatchObject({
      hostedExternally: false,
      removeFromBundle: [],
      requiredInBundle: OFFLOADED_MP4_FILES,
      missingFromBundle: ['TM-Hero-bg-mobile-hero.mp4', 'groups-hero.mp4'],
    });
  });

  it('excludes archived and Finder duplicate artifacts consistently', () => {
    expect(shouldExcludeArtifactPath('assets/extracted/gradient-animated.html')).toBe(true);
    expect(shouldExcludeArtifactPath('assets/mockup-reference/hero.png')).toBe(true);
    expect(shouldExcludeArtifactPath('js 2/nav.js')).toBe(true);
    expect(shouldExcludeArtifactPath('css/site 2.css')).toBe(true);
    expect(shouldExcludeArtifactPath('css/site.css')).toBe(false);
    expect(isFinderDuplicateName('sitemap 2.xml')).toBe(true);
  });
});
