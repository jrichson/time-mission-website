'use strict';

const fs = require('node:fs');
const path = require('node:path');

const OFFLOADED_MP4_FILES = ['TM-Hero-bg-web-hero.mp4', 'TM-Hero-bg-mobile-hero.mp4', 'groups-hero.mp4'];

const MANDATORY_ROOT_FILES = [
  '_headers.tmpl',
  '_redirects',
  '_routes.json',
  'robots.txt',
  'license.xml',
];

const MANDATORY_ASSET_DIRS = ['assets', 'css', 'js', 'data'];

const STATIC_EXCLUDED_ARTIFACT_PATH_RE = /(?:^|\/)(?:assets\/extracted|mockup-reference|_archive)(?:\/|$)/i;

function finderOriginalName(name) {
  const match = String(name || '').match(/^(.+)\s[0-9]+(\.[^/.]+)?$/);
  if (!match) return '';
  return `${match[1]}${match[2] || ''}`;
}

function hasFinderOriginalSibling(name, siblingNames = new Set()) {
  const original = finderOriginalName(name);
  return Boolean(original && siblingNames.has(original));
}

function shouldExcludeArtifactPath(relPath) {
  const normalized = String(relPath || '').split('\\').join('/');
  return STATIC_EXCLUDED_ARTIFACT_PATH_RE.test(normalized);
}

function shouldPruneArtifactEntry(relPath, entryName, siblingNames = new Set()) {
  return shouldExcludeArtifactPath(relPath) || hasFinderOriginalSibling(entryName, siblingNames);
}

function normalizedRelativePath(baseDir, absPath) {
  return path.relative(baseDir, absPath).split(path.sep).join('/');
}

function pruneExcludedArtifacts(dir, { baseDir = dir } = {}) {
  const removed = [];
  if (!fs.existsSync(dir)) return removed;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const siblingNames = new Set(entries.map((entry) => entry.name));
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = normalizedRelativePath(baseDir, abs);
    if (shouldPruneArtifactEntry(rel, entry.name, siblingNames)) {
      fs.rmSync(abs, { recursive: true, force: true });
      removed.push(rel);
      continue;
    }
    if (entry.isDirectory()) {
      removed.push(...pruneExcludedArtifacts(abs, { baseDir }));
    }
  }
  return removed;
}

function walkDeployFiles(dir, { baseDir = dir, includeFile = () => true, onPruned = null } = {}) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const siblingNames = new Set(entries.map((entry) => entry.name));
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = normalizedRelativePath(baseDir, abs);
    if (shouldPruneArtifactEntry(rel, entry.name, siblingNames)) {
      if (typeof onPruned === 'function') onPruned(rel);
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...walkDeployFiles(abs, { baseDir, includeFile, onPruned }));
    } else if (entry.isFile() && includeFile(abs, rel)) {
      files.push(abs);
    }
  }
  return files;
}

function copyFilteredTree(src, dest, { baseDir = path.dirname(src) } = {}) {
  const stat = fs.statSync(src);
  if (!stat.isDirectory()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  const siblingNames = new Set(entries.map((entry) => entry.name));
  for (const entry of entries) {
    const srcAbs = path.join(src, entry.name);
    const rel = normalizedRelativePath(baseDir, srcAbs);
    if (shouldPruneArtifactEntry(rel, entry.name, siblingNames)) continue;
    const destAbs = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFilteredTree(srcAbs, destAbs, { baseDir });
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      fs.copyFileSync(srcAbs, destAbs);
    }
  }
}

function planRequiredArtifacts() {
  return {
    rootFiles: [...MANDATORY_ROOT_FILES],
    assetDirs: [...MANDATORY_ASSET_DIRS],
    requiredDataFiles: ['data/locations.json'],
  };
}

function planVideoArtifacts({ mediaBase = '', availableFiles = [] } = {}) {
  const hostedExternally = Boolean(String(mediaBase || '').trim());
  const available = new Set(availableFiles);
  return {
    hostedExternally,
    removeFromBundle: hostedExternally ? [...OFFLOADED_MP4_FILES] : [],
    requiredInBundle: hostedExternally ? [] : [...OFFLOADED_MP4_FILES],
    missingFromBundle: hostedExternally
      ? []
      : OFFLOADED_MP4_FILES.filter((name) => !available.has(name)),
  };
}

module.exports = {
  OFFLOADED_MP4_FILES,
  MANDATORY_ROOT_FILES,
  MANDATORY_ASSET_DIRS,
  copyFilteredTree,
  pruneExcludedArtifacts,
  shouldExcludeArtifactPath,
  shouldPruneArtifactEntry,
  walkDeployFiles,
  planRequiredArtifacts,
  planVideoArtifacts,
};
