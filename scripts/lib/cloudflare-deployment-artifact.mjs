import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { resolveSiteProfile } from '../../config/site-profiles.mjs';
import { renderEuWranglerConfig } from './eu-wrangler-config.mjs';

export const DEPLOYMENT_VERIFICATION_PATH = 'data/deployment-verification.json';
const DEPLOYMENT_MODES = new Set(['production', 'preview']);

function deploymentMode(options = {}) {
  const mode = String(options.deploymentMode || 'production').trim().toLowerCase();
  if (!DEPLOYMENT_MODES.has(mode)) {
    throw new Error(`Deployment mode must be "production" or "preview" (received ${JSON.stringify(mode)}).`);
  }
  return mode;
}

function hashEntries(entries) {
  const hash = crypto.createHash('sha256');
  for (const [name, content] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(name);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }
  return hash.digest('hex');
}

function treeEntries(rootDir, options = {}) {
  if (!fs.existsSync(rootDir)) return [];
  const entries = [];
  const excluded = new Set(options.excluded || []);

  function visit(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const absolute = path.join(currentDir, entry.name);
      const relative = path.relative(rootDir, absolute).split(path.sep).join('/');
      if (excluded.has(relative)) continue;
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) entries.push([relative, fs.readFileSync(absolute)]);
    }
  }

  visit(rootDir);
  return entries;
}

function configSource(root, profile, env, options = {}) {
  if (profile.id === 'eu') {
    return renderEuWranglerConfig(root, env, {
      requireTurnstile: options.requireTurnstile !== false,
    });
  }
  return fs.readFileSync(path.join(root, 'wrangler.toml'), 'utf8');
}

function readProfileMarker(root) {
  const markerPath = path.join(root, 'dist', 'data', 'site-profile.json');
  if (!fs.existsSync(markerPath)) {
    throw new Error('Missing dist/data/site-profile.json; build the requested profile first.');
  }
  return JSON.parse(fs.readFileSync(markerPath, 'utf8'));
}

function computeStagedDeploymentDigest(workspaceDir) {
  return hashEntries([
    ...treeEntries(path.join(workspaceDir, 'dist'), {
      excluded: [DEPLOYMENT_VERIFICATION_PATH],
    }).map(([name, content]) => [`dist/${name}`, content]),
    ...treeEntries(path.join(workspaceDir, 'functions'))
      .map(([name, content]) => [`functions/${name}`, content]),
    ...treeEntries(path.join(workspaceDir, 'migrations'))
      .map(([name, content]) => [`migrations/${name}`, content]),
    ['wrangler.toml', fs.readFileSync(path.join(workspaceDir, 'wrangler.toml'))],
  ]);
}

function assertProfileMarker(marker, profile, options = {}) {
  if (
    marker.profile !== profile.id
    || marker.origin !== profile.origin
    || marker.pagesProject !== profile.pagesProject
  ) {
    throw new Error(
      `Artifact marker ${JSON.stringify(marker)} does not match the ${profile.id} profile.`,
    );
  }
  const mode = deploymentMode(options);
  if (mode === 'production' && marker.deploymentReady !== true) {
    throw new Error('Artifact was not built with the production deployment gate.');
  }
  if (mode === 'preview' && marker.deploymentReady !== false) {
    throw new Error('Preview deployments require a non-production artifact.');
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function computeDeploymentSourceDigest(root, requestedProfile, env = process.env) {
  const profile = resolveSiteProfile({ ...env, TM_SITE_PROFILE: requestedProfile });
  const renderedConfig = configSource(root, profile, env, {
    requireTurnstile: profile.id === 'eu',
  });
  const entries = [
    ...treeEntries(path.join(root, 'dist'), { excluded: [DEPLOYMENT_VERIFICATION_PATH] })
      .map(([name, content]) => [`dist/${name}`, content]),
    ...treeEntries(path.join(root, 'functions'))
      .map(([name, content]) => [`functions/${name}`, content]),
    ...treeEntries(path.join(root, 'migrations'))
      .map(([name, content]) => [`migrations/${name}`, content]),
    ['wrangler.toml', renderedConfig],
  ];
  return hashEntries(entries);
}

export function writeDeploymentVerification(root, requestedProfile, env = process.env, options = {}) {
  const profile = resolveSiteProfile({ ...env, TM_SITE_PROFILE: requestedProfile });
  const mode = deploymentMode(options);
  const marker = readProfileMarker(root);
  assertProfileMarker(marker, profile, { deploymentMode: mode });
  const verification = {
    version: 2,
    deploymentMode: mode,
    profile: profile.id,
    origin: profile.origin,
    pagesProject: profile.pagesProject,
    sourceDigest: computeDeploymentSourceDigest(root, profile.id, env),
  };
  const verificationPath = path.join(root, 'dist', DEPLOYMENT_VERIFICATION_PATH);
  fs.mkdirSync(path.dirname(verificationPath), { recursive: true });
  fs.writeFileSync(verificationPath, `${JSON.stringify(verification, null, 2)}\n`);
  return verification;
}

export function readVerifiedDeployment(root, requestedProfile, env = process.env, options = {}) {
  const profile = resolveSiteProfile({ ...env, TM_SITE_PROFILE: requestedProfile });
  const mode = deploymentMode(options);
  const marker = readProfileMarker(root);
  assertProfileMarker(marker, profile, { deploymentMode: mode });
  if (profile.id === 'eu') {
    const euTurnstileSiteKey = String(env[profile.turnstileSiteKeyEnv] || '').trim();
    if (!euTurnstileSiteKey || marker.turnstileSiteKeyHash !== sha256(euTurnstileSiteKey)) {
      throw new Error('Verified EU artifact does not match EU_TURNSTILE_SITE_KEY.');
    }
  }
  const verificationPath = path.join(root, 'dist', DEPLOYMENT_VERIFICATION_PATH);
  if (!fs.existsSync(verificationPath)) {
    throw new Error(`Missing ${mode} deployment verification stamp; run the matching artifact gate.`);
  }
  const verification = JSON.parse(fs.readFileSync(verificationPath, 'utf8'));
  const expectedDigest = computeDeploymentSourceDigest(root, profile.id, env);
  if (
    verification.version !== 2
    || verification.deploymentMode !== mode
    || verification.profile !== profile.id
    || verification.origin !== profile.origin
    || verification.pagesProject !== profile.pagesProject
    || verification.sourceDigest !== expectedDigest
  ) {
    throw new Error('Deployment inputs changed after verification; rebuild and verify the artifact.');
  }
  return { marker, profile, verification };
}

export function localWranglerBin(root) {
  const extension = process.platform === 'win32' ? '.cmd' : '';
  const local = path.join(root, 'node_modules', '.bin', `wrangler${extension}`);
  return fs.existsSync(local) ? local : 'wrangler';
}

export function createCloudflareDeploymentArtifact(
  root,
  requestedProfile,
  env = process.env,
  options = {},
) {
  const kind = options.kind || 'pages';
  const mode = deploymentMode(options);
  const profile = resolveSiteProfile({ ...env, TM_SITE_PROFILE: requestedProfile });
  const verified = kind === 'pages'
    ? readVerifiedDeployment(root, profile.id, env, { deploymentMode: mode })
    : null;

  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), `tm-cloudflare-${profile.id}-`));
  try {
    if (kind === 'pages') {
      fs.cpSync(path.join(root, 'dist'), path.join(workspaceDir, 'dist'), { recursive: true });
      fs.cpSync(path.join(root, 'functions'), path.join(workspaceDir, 'functions'), { recursive: true });
    } else {
      fs.mkdirSync(path.join(workspaceDir, 'dist'), { recursive: true });
    }
    fs.cpSync(path.join(root, 'migrations'), path.join(workspaceDir, 'migrations'), { recursive: true });

    const renderedConfig = configSource(root, profile, env, {
      requireTurnstile: kind === 'pages',
    });
    const configPath = path.join(workspaceDir, 'wrangler.toml');
    fs.writeFileSync(configPath, renderedConfig, { mode: 0o600 });

    const stagedDigest = kind === 'pages'
      ? computeStagedDeploymentDigest(workspaceDir)
      : hashEntries([
        ...treeEntries(path.join(workspaceDir, 'migrations')),
        ['wrangler.toml', renderedConfig],
      ]);
    if (verified && stagedDigest !== verified.verification.sourceDigest) {
      throw new Error('Staged Cloudflare Artifact does not match the verified deployment inputs.');
    }

    const manifest = {
      version: 1,
      kind,
      deploymentMode: kind === 'pages' ? mode : null,
      profile: profile.id,
      origin: profile.origin,
      pagesProject: profile.pagesProject,
      sourceDigest: stagedDigest,
    };
    fs.writeFileSync(
      path.join(workspaceDir, 'cloudflare-artifact.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    return {
      configPath,
      manifest,
      profile,
      workspaceDir,
      cleanup() {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
    throw error;
  }
}
