#!/usr/bin/env node
/**
 * Post-deploy checks against the live production sites.
 *
 *   node scripts/verify-live.mjs [--commit <sha>] [--profiles us,eu] [--skip-browser]
 *
 * Confirms each site serves the expected release, keeps the header CSP to
 * frame-ancestors, and still loads GTM with the Meta/Google/TikTok hosts
 * allowed. Then runs the live provider suite, which includes the US and
 * consented-EU tracking check in a real browser.
 */
import dns from 'node:dns';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { GTM_CONTAINER_ID, RELEASE_PROFILES } from '../config/deployment-targets.mjs';
import { resolveSiteProfile } from '../config/site-profiles.mjs';
import { headerCspProblems, pageTrackingProblems } from './lib/release-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SAMPLE_PATHS = {
  us: ['/', '/houston', '/houston/educators', '/philadelphia'],
  eu: ['/', '/eindhoven', '/nl/eindhoven/signup'],
};

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? '' : String(process.argv[index + 1] || '').trim();
}

const expectedCommit = argValue('--commit');
const profiles = (argValue('--profiles') || RELEASE_PROFILES.join(','))
  .split(',')
  .map((profile) => profile.trim())
  .filter(Boolean);
const skipBrowser = process.argv.includes('--skip-browser');

// Some networks advertise IPv6 routes that time out; the sites serve both.
dns.setDefaultResultOrder('ipv4first');

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        headers: { 'cache-control': 'no-cache' },
        signal: AbortSignal.timeout(20_000),
      });
      return { response, text: await response.text() };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
  }
  throw new Error(`could not reach ${url}: ${lastError?.cause?.code || lastError?.message || lastError}`);
}

async function servedCommit(origin) {
  let response;
  let text;
  try {
    ({ response, text } = await fetchText(`${origin}/data/site-profile.json?ts=${Date.now()}`));
  } catch (error) {
    return { error: error.message };
  }
  if (!response.ok) return { error: `site-profile.json returned ${response.status}` };
  try {
    return { marker: JSON.parse(text) };
  } catch {
    return { error: 'site-profile.json is not JSON' };
  }
}

/** Cloudflare can take a short while to switch every edge to a new deployment. */
async function waitForCommit(origin, commit) {
  const deadline = Date.now() + 3 * 60_000;
  let last;
  while (Date.now() < deadline) {
    last = await servedCommit(origin);
    if (last.marker?.commit === commit) return [];
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  return [
    last?.error
      || `serves commit ${last?.marker?.commit || '(none)'} instead of ${commit}`,
  ];
}

async function checkProfile(profileId) {
  const profile = resolveSiteProfile({ TM_SITE_PROFILE: profileId });
  const problems = [];
  if (expectedCommit) problems.push(...(await waitForCommit(profile.origin, expectedCommit)));

  for (const pagePath of SAMPLE_PATHS[profileId] || ['/']) {
    let response;
    let text;
    try {
      ({ response, text } = await fetchText(`${profile.origin}${pagePath}`));
    } catch (error) {
      problems.push(`${pagePath}: ${error.message}`);
      continue;
    }
    if (response.status !== 200) {
      problems.push(`${pagePath} returned ${response.status}`);
      continue;
    }
    for (const problem of headerCspProblems(response.headers.get('content-security-policy'))) {
      problems.push(`${pagePath}: ${problem}`);
    }
    for (const problem of pageTrackingProblems(text, { gtmId: GTM_CONTAINER_ID })) {
      problems.push(`${pagePath}: ${problem}`);
    }
  }
  return { origin: profile.origin, problems };
}

let failed = false;
for (const profileId of profiles) {
  const { origin, problems } = await checkProfile(profileId);
  if (problems.length) {
    failed = true;
    console.error(`✗ ${origin}\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  } else {
    console.log(`✓ ${origin}: release, header CSP, and tracking tags look right`);
  }
}

if (!skipBrowser) {
  // The provider registry is US-hosted; its tracking check also covers consented EU.
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['playwright', 'test', '--config', 'playwright.providers.config.cjs'],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, TM_PROVIDER_BASE_URL: 'https://www.timemission.com' },
    },
  );
  if (result.status !== 0) {
    failed = true;
    console.error('✗ Live provider and tracking browser suite failed (see output above).');
  }
}

if (failed) {
  console.error('\nLive verification FAILED. Roll back from the Cloudflare dashboard if customers are affected.');
  process.exit(1);
}
console.log('\nLive verification passed.');
