import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  cmsDeployDecision,
  d1DatabaseId,
  gitReleaseProblems,
  headerCspProblems,
  newestRailwayDeployment,
  pageTrackingProblems,
} from '../scripts/lib/release-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const SHA = 'a'.repeat(40);

describe('release guard', () => {
  it('only releases a clean commit that matches origin', () => {
    expect(gitReleaseProblems({ branch: 'main', statusPorcelain: '?? scratch.txt', head: SHA, upstreamHead: SHA })).toEqual([]);
    expect(gitReleaseProblems({ branch: 'main', statusPorcelain: ' M _headers', head: SHA, upstreamHead: SHA })[0])
      .toContain('M _headers');
    expect(gitReleaseProblems({ branch: 'main', statusPorcelain: '', head: SHA, upstreamHead: 'b'.repeat(40) })[0])
      .toContain('Push or pull first');
    expect(gitReleaseProblems({ branch: 'main', statusPorcelain: '', head: SHA, upstreamHead: '' })[0])
      .toContain('no pushed copy');
    expect(gitReleaseProblems({ branch: '', statusPorcelain: '', head: SHA, upstreamHead: '' })[0])
      .toContain('detached');
  });

  it('deploys the CMS unless it provably has not changed since the live release', () => {
    expect(cmsDeployDecision({ liveCommit: null, cmsChangedSinceLive: null }).deploy).toBe(true);
    expect(cmsDeployDecision({ liveCommit: SHA, cmsChangedSinceLive: null }).deploy).toBe(true);
    expect(cmsDeployDecision({ liveCommit: SHA, cmsChangedSinceLive: true }).deploy).toBe(true);
    expect(cmsDeployDecision({ liveCommit: SHA, cmsChangedSinceLive: false }).deploy).toBe(false);
    expect(cmsDeployDecision({ mode: 'skip', liveCommit: null }).deploy).toBe(false);
    expect(cmsDeployDecision({ mode: 'force', liveCommit: SHA, cmsChangedSinceLive: false }).deploy).toBe(true);
  });

  it('finds the new Railway deployment and the EU D1 database', () => {
    const deployments = [
      { id: 'old', status: 'SUCCESS', createdAt: '2026-09-25T17:22:28Z' },
      { id: 'new', status: 'DEPLOYING', createdAt: '2026-09-30T20:00:00Z' },
    ];
    expect(newestRailwayDeployment(deployments, new Set(['old']))?.id).toBe('new');
    expect(newestRailwayDeployment(deployments, new Set(['old', 'new']))).toBeNull();

    const d1 = '\n[{"uuid":"eu-id","name":"time-mission-forms-eu","jurisdiction":"eu"},{"uuid":"us-id","name":"time-mission-forms","jurisdiction":null}]';
    expect(d1DatabaseId(d1, 'time-mission-forms-eu', 'eu')).toBe('eu-id');
    expect(d1DatabaseId(d1, 'time-mission-forms-eu', null)).toBe('eu-id');
    expect(d1DatabaseId('not json', 'time-mission-forms-eu', 'eu')).toBeNull();
  });

  it('rejects a response-header CSP stricter than frame-ancestors', () => {
    expect(headerCspProblems("frame-ancestors 'self'")).toEqual([]);
    // The 2026-09-25 header that blocked every GTM Custom HTML tag.
    expect(headerCspProblems("default-src 'self'; script-src 'self' 'sha256-abc'; frame-ancestors 'self'")[0])
      .toContain("script-src 'self' 'sha256-abc'");
    expect(headerCspProblems('')[0]).toContain('missing');
  });

  it('requires the tracking hosts and GTM container in page HTML', () => {
    const meta = (hosts) => `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src-elem 'self' ${hosts}; connect-src 'self'">`;
    const allowed = 'https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com';
    expect(pageTrackingProblems(`${meta(allowed)}GTM-TEST`, { gtmId: 'GTM-TEST' })).toEqual([]);
    expect(pageTrackingProblems(`${meta('https://www.googletagmanager.com')}GTM-TEST`, { gtmId: 'GTM-TEST' }))
      .toEqual([
        'CSP script-src-elem is missing https://connect.facebook.net',
        'CSP script-src-elem is missing https://analytics.tiktok.com',
      ]);
    expect(pageTrackingProblems(meta(allowed), { gtmId: 'GTM-TEST' })).toEqual(['page does not load GTM-TEST']);
    expect(pageTrackingProblems('<html></html>', { gtmId: '' })).toEqual(['missing CSP meta tag']);
  });

  it('keeps production deploys behind the release command and the production CMS', () => {
    const deploy = read('scripts/deploy-pages-profile.mjs');
    expect(deploy).toContain("if (!preview && !releaseCommit && !allowUnreleased)");
    expect(deploy).toContain("PAYLOAD_CMS_BUILD_STRICT: 'true'");
    expect(deploy).toContain("'--commit-hash', releaseCommit");
    expect(read('package.json')).toContain('"release": "node scripts/release.mjs"');
    expect(read('scripts/inject-csp-hashes.mjs')).toContain("if (siteProfile.id === 'us') fs.copyFileSync(distHeadersPath, rootHeadersPath);");
    const workflow = read('.github/workflows/cms-wrangler-deploy.yml');
    expect(workflow.match(/TM_RELEASE_COMMIT: \$\{\{ github\.sha \}\}/g)).toHaveLength(3);
  });
});
