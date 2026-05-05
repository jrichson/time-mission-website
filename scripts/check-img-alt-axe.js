'use strict';
/**
 * check-img-alt-axe.js
 *
 * Scans all Astro-rendered dist/ HTML files for critical/serious axe-core
 * image-accessibility violations. Reads the list of output files from
 * src/data/site/astro-rendered-output-files.json so the scan stays in sync
 * with the Astro route manifest.
 *
 * Requires: npm run build:astro first (dist/ must exist).
 * Usage: node scripts/check-img-alt-axe.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const net = require('node:net');

const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'src', 'data', 'site', 'astro-rendered-output-files.json');

// Read the output-files manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const outputFiles = manifest.outputFiles;

if (!outputFiles || !outputFiles.length) {
  console.error('check-img-alt-axe: astro-rendered-output-files.json has no outputFiles');
  process.exit(1);
}

const BASE_URL = 'http://127.0.0.1:4173';

// Violation IDs to check — image/video a11y rules
const TARGET_IDS = new Set([
  'image-alt',
  'image-redundant-alt',
  'role-img-alt',
  'video-caption',
  'video-description',
]);

// Poll until the preview server is reachable (max 30s)
async function waitForServer(maxMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const alive = await new Promise((resolve) => {
      const sock = net.createConnection({ host: '127.0.0.1', port: 4173 });
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('error', () => { sock.destroy(); resolve(false); });
    });
    if (alive) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  const errors = [];
  let serverChild = null;
  let browser = null;

  try {
    // Start preview server if not already running
    const alreadyUp = await waitForServer(1500);
    if (!alreadyUp) {
      const isWin = process.platform === 'win32';
      serverChild = require('node:child_process').spawn(
        isWin ? 'npm.cmd' : 'npm',
        ['run', 'preview:test'],
        { cwd: root, stdio: 'ignore', detached: !isWin }
      );
      const ready = await waitForServer(30_000);
      if (!ready) {
        console.error('check-img-alt-axe: preview server did not start within 30s');
        process.exit(1);
      }
    }

    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    for (const outputFile of outputFiles) {
      // Use clean URL (strip .html extension per ROUTE-01 contract)
      const cleanPath = outputFile.replace(/\.html$/, '');
      const url = `${BASE_URL}/${cleanPath}`;

      await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      for (const violation of results.violations) {
        const isTargetedId = TARGET_IDS.has(violation.id) || violation.id.startsWith('image-') || violation.id.startsWith('video-');
        const isSevere = violation.impact === 'critical' || violation.impact === 'serious';

        if (isSevere && isTargetedId) {
          for (const node of violation.nodes) {
            errors.push(
              `${url}: ${violation.id} (${violation.impact}) — ${violation.description}\n    Node: ${node.html}`
            );
          }
        }
      }
    }

    await context.close();
    await browser.close();
    browser = null;

  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    if (serverChild) {
      try {
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/PID', String(serverChild.pid), '/F', '/T']);
        } else {
          process.kill(-serverChild.pid, 'SIGTERM');
        }
      } catch (_) {}
    }
  }

  if (errors.length > 0) {
    console.error('check-img-alt-axe failed:');
    for (const e of errors) console.error('- ' + e);
    process.exit(1);
  }

  console.log(`check-img-alt-axe passed for ${outputFiles.length} pages.`);
}

main().catch((err) => {
  console.error('check-img-alt-axe: unexpected error:', err.message || err);
  process.exit(1);
});
