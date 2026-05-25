'use strict';

const OFFLOADED_MP4_FILES = ['TM-Hero-bg-web-hero.mp4', 'TM-Hero-bg-mobile-hero.mp4', 'groups-hero.mp4'];

const MANDATORY_ROOT_FILES = [
  '_headers.tmpl',
  '_redirects',
  '_routes.json',
  'robots.txt',
  'license.xml',
];

const MANDATORY_ASSET_DIRS = ['assets', 'css', 'js', 'data'];

const VERIFY_STEPS = [
  ['check', []],
  ['build:astro', []],
  ['check:csp-hashes', []],
  ['check:routes', ['--', '--dist']],
  ['check:links', ['--', '--dist']],
  ['check:astro-dist', []],
  ['check:payload-dist', []],
  ['check:ticket-panel-parity', []],
  ['check:seo-output', []],
  ['check:schema-output', []],
  ['check:img-alt-axe', []],
  ['check:hreflang-cluster', []],
  ['check:tap-targets', []],
  ['check:sitemap-output', []],
  ['check:robots-ai', []],
  ['check:llms-txt', []],
  ['check:geo-answer-blocks', []],
  ['check:rsl', []],
  ['check:nap-parity', []],
  ['test:smoke', []],
];

const VERIFY_SUCCESS_MESSAGE = 'verify-site-output.mjs: all steps passed.';

const FINDER_DUPLICATE_DIR_RE = /\s[0-9]+$/;
const FINDER_DUPLICATE_FILE_RE = /\s[0-9]+(?:\.[a-z0-9]+)?$/i;

function isFinderDuplicateName(name) {
  return FINDER_DUPLICATE_DIR_RE.test(name) || FINDER_DUPLICATE_FILE_RE.test(name);
}

function shouldExcludeArtifactPath(relPath) {
  const normalized = String(relPath || '').split('\\').join('/');
  return /(?:^|\/)assets\/extracted(?:\/|$)/i.test(normalized)
    || /(?:^|\/)(?:mockup-reference|_archive)(?:\/|$)/i.test(normalized)
    || /(?:^|\/)[^/]*\s[0-9]+(?:\/|$)/i.test(normalized)
    || /\s[0-9]+\.[a-z0-9]+$/i.test(normalized);
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

function resolveNpmStep(step, platform = process.platform) {
  const [name, forwarded] = step;
  return {
    command: platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', name, ...(forwarded || [])],
  };
}

function formatNpmStep(step) {
  const resolved = resolveNpmStep(step, 'posix');
  return [resolved.command, ...resolved.args].join(' ');
}

module.exports = {
  OFFLOADED_MP4_FILES,
  MANDATORY_ROOT_FILES,
  MANDATORY_ASSET_DIRS,
  VERIFY_STEPS,
  VERIFY_SUCCESS_MESSAGE,
  isFinderDuplicateName,
  shouldExcludeArtifactPath,
  planRequiredArtifacts,
  planVideoArtifacts,
  resolveNpmStep,
  formatNpmStep,
};
