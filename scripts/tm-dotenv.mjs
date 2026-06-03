/**
 * Shared public build env parsing and merge.
 * Used by scripts/sync-static-to-public.mjs and the Astro build wrapper so behavior matches.
 *
 * Matches common shell habits: `export PUBLIC_TM_MEDIA_BASE=https://…`
 */
import fs from 'node:fs';
import path from 'node:path';

export const TM_ENV_FILE_CHAIN = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
];

const WRANGLER_PUBLIC_VAR_SECTIONS = new Set(['vars', 'env.production.vars']);

/**
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parseTmEnvFileBody(content) {
  const out = {};
  const text = typeof content === 'string' ? content.replace(/^\uFEFF/, '') : '';
  for (const line of text.split('\n')) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^export\s+/i.test(trimmed)) {
      trimmed = trimmed.replace(/^export\s+/i, '').trimStart();
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    let key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    const exportAsKeyPrefix = /^export\s+/i;
    while (exportAsKeyPrefix.test(key)) {
      key = key.replace(exportAsKeyPrefix, '').trim();
    }
    if (!key) continue;
    out[key] = val;
  }
  return out;
}

/** Later files override (same layering idea as Vite). */
export function mergeTmDotEnvFromDisk(repoRoot) {
  const merged = {};
  for (const name of TM_ENV_FILE_CHAIN) {
    const abs = path.join(repoRoot, name);
    if (!fs.existsSync(abs)) continue;
    Object.assign(merged, parseTmEnvFileBody(fs.readFileSync(abs, 'utf8')));
  }
  return merged;
}

/**
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parseTmWranglerPublicVarsBody(content) {
  const out = {};
  const text = typeof content === 'string' ? content.replace(/^\uFEFF/, '') : '';
  let inPublicVars = false;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const section = trimmed.match(/^\[([^\]]+)\]$/);
    if (section) {
      inPublicVars = WRANGLER_PUBLIC_VAR_SECTIONS.has(section[1].trim());
      continue;
    }

    if (!inPublicVars) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!/^PUBLIC_[A-Z0-9_]+$/.test(key)) continue;

    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }

  return out;
}

export function mergeTmWranglerPublicVarsFromDisk(repoRoot) {
  const abs = path.join(repoRoot, 'wrangler.toml');
  if (!fs.existsSync(abs)) return {};
  return parseTmWranglerPublicVarsBody(fs.readFileSync(abs, 'utf8'));
}

export function mergeTmPublicBuildEnvFromDisk(repoRoot) {
  return {
    ...mergeTmWranglerPublicVarsFromDisk(repoRoot),
    ...mergeTmDotEnvFromDisk(repoRoot),
  };
}

/** Hydrate process.env from public build env when shell value is absent or whitespace-only. */
export function applyTmDotEnvToProcess(repoRoot) {
  const merged = mergeTmPublicBuildEnvFromDisk(repoRoot);
  for (const [key, val] of Object.entries(merged)) {
    const cur = process.env[key];
    const hasShellValue = !(cur === undefined || String(cur).trim() === '');
    if (!hasShellValue && val !== undefined) process.env[key] = val;
  }
}

/**
 * Trailing slashes stripped. Falls back to re-reading disks if process missing.
 * @param {string} repoRoot
 * @returns {string}
 */
export function normalizedPublicTmMediaBase(repoRoot) {
  let raw = process.env.PUBLIC_TM_MEDIA_BASE;
  if (!(typeof raw === 'string' && raw.trim())) {
    const fromDisk = mergeTmPublicBuildEnvFromDisk(repoRoot).PUBLIC_TM_MEDIA_BASE;
    if (typeof fromDisk === 'string' && fromDisk.trim()) {
      raw = fromDisk.trim();
      process.env.PUBLIC_TM_MEDIA_BASE = raw;
    }
  }
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/\/$/, '');
}
