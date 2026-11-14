#!/usr/bin/env node
/**
 * The only supported way to put the website into production.
 *
 *   npm run release -- [--cms=auto|skip|force] [--only=us|eu] [--serial] [--verify-only] [--dry-run] [--skip-live-checks]
 *
 * 1. Refuses to run unless HEAD is a clean, pushed commit.
 * 2. Builds from a fresh checkout of that commit, so local edits, untracked
 *    files, and stale build output can never reach production.
 * 3. Deploys the Railway CMS first (its start-up migrations must run before the
 *    static build reads CMS content).
 * 4. Builds and verifies the US and EU sites side by side, each in its own checkout
 *    on its own ports (--serial runs them one after the other). Nothing is deployed
 *    unless every site passes.
 * 5. Deploys the sites, then verifies the live sites serve that commit with tracking intact.
 */
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { CMS_PRODUCTION, RELEASE_PROFILES } from '../config/deployment-targets.mjs';
import { resolveSiteProfile } from '../config/site-profiles.mjs';
import {
  cmsDeployDecision,
  gitReleaseProblems,
  newestRailwayDeployment,
  RAILWAY_TERMINAL_FAILURES,
} from './lib/release-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.production.local'];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function option(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : fallback;
}

const cmsMode = option('cms', 'auto');
const only = option('only', '');
const dryRun = process.argv.includes('--dry-run');
const serial = process.argv.includes('--serial');
// Build and verify every site exactly as a release would, but deploy nothing.
const verifyOnly = process.argv.includes('--verify-only');
const skipLiveChecks = process.argv.includes('--skip-live-checks');
if (!['auto', 'skip', 'force'].includes(cmsMode)) fail('--cms must be auto, skip, or force.');
if (only && !RELEASE_PROFILES.includes(only)) fail(`--only must be one of ${RELEASE_PROFILES.join(', ')}.`);
const profiles = only ? [only] : RELEASE_PROFILES;

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function step(message) {
  console.log(`\n▶ ${message}`);
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd || root, encoding: 'utf8' });
  return { status: result.status, stdout: String(result.stdout || '').trimEnd(), stderr: String(result.stderr || '').trim() };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd || root, stdio: 'inherit', env: options.env || process.env });
  if (result.status !== 0) {
    throw new Error(`${[command, ...args].join(' ')} failed (exit ${result.status ?? 'signal'})`);
  }
}

/** Run a command without blocking, prefixing each output line so parallel runs stay readable. */
function runLabelled(label, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const [stream, out] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
      let pending = '';
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        const lines = (pending + chunk).split('\n');
        pending = lines.pop();
        for (const line of lines) out.write(`[${label}] ${line}\n`);
      });
      stream.on('end', () => {
        if (pending) out.write(`[${label}] ${pending}\n`);
      });
    }
    child.on('error', reject);
    child.on('close', (status) => {
      if (status === 0) resolve();
      else reject(new Error(`[${label}] ${[path.basename(command), ...args].join(' ')} failed (exit ${status ?? 'signal'})`));
    });
  });
}

/** A port nothing is listening on, so a release never tests another process's server. */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function git(args, options) {
  return capture('git', args, options);
}

async function liveReleaseCommit() {
  const origin = resolveSiteProfile({ TM_SITE_PROFILE: 'us' }).origin;
  try {
    const response = await fetch(`${origin}/data/site-profile.json?ts=${Date.now()}`, {
      signal: AbortSignal.timeout(20_000),
    });
    return response.ok ? (await response.json()).commit || null : null;
  } catch {
    return null;
  }
}

function cmsChangedSince(liveCommit) {
  if (!liveCommit || git(['cat-file', '-e', `${liveCommit}^{commit}`]).status !== 0) return null;
  return git(['diff', '--quiet', liveCommit, 'HEAD', '--', 'cms']).status === 1;
}

function railwayArgs() {
  const { projectId, environment, service } = CMS_PRODUCTION.railway;
  return ['--project', projectId, '--environment', environment, '--service', service];
}

function railwayDeployments(cwd) {
  const result = capture('railway', ['deployment', 'list', ...railwayArgs(), '--json'], { cwd });
  if (result.status !== 0) throw new Error(`railway deployment list failed: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout.slice(result.stdout.indexOf('[')));
}

async function waitForCmsDeployment(worktree, knownIds) {
  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline) {
    const deployment = newestRailwayDeployment(railwayDeployments(worktree), knownIds);
    if (deployment?.status === 'SUCCESS') return deployment;
    if (deployment && RAILWAY_TERMINAL_FAILURES.has(deployment.status)) {
      throw new Error(`CMS deployment ${deployment.id} ended ${deployment.status}. The previous CMS is still serving; check Railway logs.`);
    }
    console.log(`Waiting for the CMS to start and run migrations (${deployment?.status || 'queued'})...`);
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  throw new Error('Timed out waiting for the CMS deployment to finish.');
}

async function deployCms(worktree) {
  const knownIds = new Set(railwayDeployments(worktree).map((deployment) => deployment.id));
  // The service builds from its cms/ root directory, so upload the repository root.
  run('railway', ['up', '--ci', ...railwayArgs()], { cwd: worktree });
  const deployment = await waitForCmsDeployment(worktree, knownIds);
  console.log(`CMS deployment ${deployment.id} is live.`);

  const response = await fetch(`${CMS_PRODUCTION.origin}/api/site-pages?limit=1&depth=0`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`CMS API returned ${response.status} after deploy.`);
}

function createWorktree(commit, profile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `tm-release-${commit.slice(0, 7)}-${profile}-`));
  run('git', ['worktree', 'add', '--detach', dir, commit]);
  for (const file of ENV_FILES) {
    const source = path.join(root, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dir, file));
  }
  return dir;
}

function removeWorktree(dir) {
  const result = git(['worktree', 'remove', '--force', dir]);
  if (result.status !== 0) console.warn(`Could not remove release checkout ${dir}: ${result.stderr}`);
}

async function main() {
  step('Checking the commit to release');
  const branch = git(['symbolic-ref', '--short', '-q', 'HEAD']).stdout;
  if (branch) git(['fetch', '--quiet', 'origin', branch]);
  const head = git(['rev-parse', 'HEAD']).stdout;
  const upstream = branch ? git(['rev-parse', '-q', '--verify', `origin/${branch}`]).stdout : '';
  const problems = gitReleaseProblems({
    branch,
    statusPorcelain: git(['status', '--porcelain']).stdout,
    head,
    upstreamHead: upstream,
  });
  if (problems.length) fail(`Not releasable:\n  - ${problems.join('\n  - ')}`);
  const subject = git(['log', '-1', '--format=%s', head]).stdout;

  const liveCommit = await liveReleaseCommit();
  const cms = verifyOnly
    ? { deploy: false, reason: 'verify only; nothing is deployed' }
    : only === 'eu' && cmsMode === 'auto'
    ? { deploy: false, reason: 'EU-only release; the CMS serves the US build' }
    : cmsDeployDecision({ mode: cmsMode, liveCommit, cmsChangedSinceLive: cmsChangedSince(liveCommit) });

  console.log([
    `Release ${head.slice(0, 7)} "${subject}" from ${branch}`,
    `  Live US commit: ${liveCommit ? liveCommit.slice(0, 7) : 'unknown'}`,
    `  CMS: ${cms.deploy ? 'deploy' : 'skip'} (${cms.reason})`,
    `  Sites: ${profiles.join(', ')}`,
  ].join('\n'));

  const tools = [[npx, ['wrangler', 'whoami']], ...(cms.deploy ? [['railway', ['whoami']]] : [])];
  for (const [command, args] of tools) {
    if (capture(command, args).status !== 0) fail(`${command} ${args.join(' ')} failed. Log in first.`);
  }
  if (dryRun) {
    console.log('\nDry run: nothing was deployed.');
    return;
  }

  step(profiles.length > 1 ? 'Preparing a clean checkout for each site' : 'Preparing a clean checkout');
  // One checkout per site: each build writes its own dist and generated route files.
  const worktrees = new Map();
  const deployed = [];
  let failure = null;
  try {
    for (const profile of profiles) worktrees.set(profile, createWorktree(head, profile));
    await Promise.all(profiles.map(async (profile) => {
      const cwd = worktrees.get(profile);
      await runLabelled(profile, npm, ['ci', '--no-audit', '--no-fund'], { cwd });
      await runLabelled(profile, npm, ['ci', '--no-audit', '--no-fund', '--prefix', 'cms'], { cwd });
    }));

    if (cms.deploy) {
      step('Deploying the CMS');
      await deployCms(worktrees.get(profiles[0]));
      deployed.push('cms');
    }

    const releaseEnv = { ...process.env, TM_RELEASE_COMMIT: head, TM_RELEASE_MESSAGE: subject };
    const verifySite = async (profile) => runLabelled(
      profile,
      process.execPath,
      ['scripts/deploy-pages-profile.mjs', profile, '--build', '--no-deploy'],
      {
        cwd: worktrees.get(profile),
        env: {
          ...releaseEnv,
          TM_SMOKE_PORT: String(await freePort()),
          TM_PROVIDER_PORT: String(await freePort()),
        },
      },
    );
    const names = profiles.map((profile) => profile.toUpperCase()).join(' and ');
    if (serial || profiles.length === 1) {
      for (const profile of profiles) {
        step(`Building and verifying ${profile.toUpperCase()}`);
        await verifySite(profile);
      }
    } else {
      step(`Building and verifying ${names} side by side`);
      const results = await Promise.allSettled(profiles.map(verifySite));
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length) throw new Error(failed.map((result) => result.reason.message).join('; '));
    }

    // Every site passed, so deploy them. This step reuses the verified build.
    for (const profile of verifyOnly ? [] : profiles) {
      step(`Deploying ${profile.toUpperCase()}`);
      run(process.execPath, ['scripts/deploy-pages-profile.mjs', profile], {
        cwd: worktrees.get(profile),
        env: releaseEnv,
      });
      deployed.push(profile);
    }

    if (!skipLiveChecks && !verifyOnly) {
      step('Verifying the live sites');
      run(process.execPath, ['scripts/verify-live.mjs', '--commit', head, '--profiles', profiles.join(',')], {
        cwd: worktrees.get(profiles[0]),
      });
    }
  } catch (error) {
    const partial = deployed.length ? ` Already deployed: ${deployed.join(', ')}.` : ' Nothing was deployed.';
    failure = `${error.message}.${partial}`;
  } finally {
    for (const dir of worktrees.values()) removeWorktree(dir);
  }
  if (failure) fail(failure);

  if (verifyOnly) {
    console.log(`\n✓ Verified ${head.slice(0, 7)} (${profiles.join(', ')}). Nothing was deployed.`);
    return;
  }
  console.log(`\n✓ Released ${head.slice(0, 7)} (${deployed.join(', ')}).`);
}

await main();
