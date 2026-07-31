import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createCloudflareDeploymentArtifact,
  writeDeploymentVerification,
} from '../scripts/lib/cloudflare-deployment-artifact.mjs';

const roots = [];

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-cloudflare-artifact-test-'));
  roots.push(root);
  return root;
}

function write(root, relative, content) {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

function fixtureRoot(options = {}) {
  const root = tempRoot();
  const siteKey = 'eu-site-key';
  write(root, 'dist/index.html', '<!doctype html><title>EU</title>');
  write(root, 'dist/data/site-profile.json', `${JSON.stringify({
    profile: 'eu',
    origin: 'https://www.timemission.eu',
    pagesProject: 'time-mission-website-eu',
    locales: ['en', 'nl', 'fr', 'es'],
    deploymentReady: options.deploymentReady ?? true,
    turnstileSiteKeyHash: crypto.createHash('sha256').update(siteKey).digest('hex'),
  })}\n`);
  write(root, 'functions/api/contact.js', 'export function onRequest() {}\n');
  write(root, 'migrations/0001_form_submissions.sql', 'CREATE TABLE submissions (id TEXT);\n');
  write(root, 'wrangler.toml', 'name = "time-mission-website"\n');
  write(root, 'wrangler.eu.toml.tmpl', `
name = "time-mission-website-eu"
pages_build_output_dir = "dist"
[vars]
PUBLIC_TURNSTILE_SITE_KEY = "{{EU_TURNSTILE_SITE_KEY}}"
[[d1_databases]]
binding = "FORM_SUBMISSIONS_DB"
database_name = "time-mission-forms-eu"
database_id = "{{EU_D1_DATABASE_ID}}"
migrations_dir = "migrations"
`);
  return { root, siteKey };
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('Cloudflare Artifact', () => {
  it('stages a verified Pages project with root config and sibling Functions', () => {
    const { root, siteKey } = fixtureRoot();
    const env = {
      EU_D1_DATABASE_ID: '123e4567-e89b-12d3-a456-426614174000',
      EU_TURNSTILE_SITE_KEY: siteKey,
    };
    writeDeploymentVerification(root, 'eu', env);

    const artifact = createCloudflareDeploymentArtifact(root, 'eu', env);
    try {
      expect(fs.existsSync(path.join(artifact.workspaceDir, 'wrangler.toml'))).toBe(true);
      expect(fs.existsSync(path.join(artifact.workspaceDir, 'dist/index.html'))).toBe(true);
      expect(fs.existsSync(path.join(artifact.workspaceDir, 'functions/api/contact.js'))).toBe(true);
      expect(fs.existsSync(path.join(artifact.workspaceDir, 'migrations/0001_form_submissions.sql'))).toBe(true);
      expect(fs.readFileSync(artifact.configPath, 'utf8')).toContain(`PUBLIC_TURNSTILE_SITE_KEY = "${siteKey}"`);
      expect(fs.statSync(artifact.configPath).mode & 0o777).toBe(0o600);
      expect(artifact.manifest.profile).toBe('eu');
      expect(artifact.manifest.sourceDigest).toBe(
        JSON.parse(fs.readFileSync(
          path.join(root, 'dist/data/deployment-verification.json'),
          'utf8',
        )).sourceDigest,
      );
    } finally {
      artifact.cleanup();
    }
  });

  it('stages a verified non-production artifact for an EU preview deployment', () => {
    const { root, siteKey } = fixtureRoot({ deploymentReady: false });
    const env = {
      EU_D1_DATABASE_ID: '123e4567-e89b-12d3-a456-426614174000',
      EU_TURNSTILE_SITE_KEY: siteKey,
    };
    writeDeploymentVerification(root, 'eu', env, { deploymentMode: 'preview' });

    const artifact = createCloudflareDeploymentArtifact(root, 'eu', env, {
      deploymentMode: 'preview',
    });
    try {
      expect(artifact.manifest.deploymentMode).toBe('preview');
      expect(artifact.manifest.sourceDigest).toBe(
        JSON.parse(fs.readFileSync(
          path.join(root, 'dist/data/deployment-verification.json'),
          'utf8',
        )).sourceDigest,
      );
    } finally {
      artifact.cleanup();
    }
  });

  it('does not accept a preview stamp as a production deployment stamp', () => {
    const { root, siteKey } = fixtureRoot({ deploymentReady: false });
    const env = {
      EU_D1_DATABASE_ID: '123e4567-e89b-12d3-a456-426614174000',
      EU_TURNSTILE_SITE_KEY: siteKey,
    };
    writeDeploymentVerification(root, 'eu', env, { deploymentMode: 'preview' });

    expect(() => createCloudflareDeploymentArtifact(root, 'eu', env))
      .toThrow(/production deployment gate/);
  });

  it('refuses inputs changed after the verification stamp', () => {
    const { root, siteKey } = fixtureRoot();
    const env = {
      EU_D1_DATABASE_ID: '123e4567-e89b-12d3-a456-426614174000',
      EU_TURNSTILE_SITE_KEY: siteKey,
    };
    writeDeploymentVerification(root, 'eu', env);
    write(root, 'functions/api/contact.js', 'export function onRequest() { return 1; }\n');

    expect(() => createCloudflareDeploymentArtifact(root, 'eu', env))
      .toThrow(/changed after verification/);
  });

  it('binds the rendered D1 target into the verification stamp', () => {
    const { root, siteKey } = fixtureRoot();
    const env = {
      EU_D1_DATABASE_ID: '123e4567-e89b-12d3-a456-426614174000',
      EU_TURNSTILE_SITE_KEY: siteKey,
    };
    writeDeploymentVerification(root, 'eu', env);

    expect(() => createCloudflareDeploymentArtifact(root, 'eu', {
      ...env,
      EU_D1_DATABASE_ID: '123e4567-e89b-12d3-a456-426614174001',
    })).toThrow(/changed after verification/);
  });

  it('stages migrations beside the D1 configuration', () => {
    const { root } = fixtureRoot();
    const artifact = createCloudflareDeploymentArtifact(root, 'eu', {
      EU_D1_DATABASE_ID: '123e4567-e89b-12d3-a456-426614174000',
    }, { kind: 'd1' });
    try {
      expect(fs.existsSync(path.join(artifact.workspaceDir, 'migrations/0001_form_submissions.sql'))).toBe(true);
      expect(fs.readFileSync(artifact.configPath, 'utf8')).toContain('migrations_dir = "migrations"');
    } finally {
      artifact.cleanup();
    }
  });
});
