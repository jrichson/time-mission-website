/**
 * Shared Cloudflare Pages artifact policy.
 * Build steps use this Module to keep pre-build public/ sync and post-build
 * dist/ cleanup aligned.
 */

export const OFFLOADED_MP4_FILES = ['hero-bg-web.mp4', 'hero-bg-mobile.mp4', 'groups-hero.mp4'];

export const MANDATORY_ROOT_FILES = [
  '_headers.tmpl',
  '_redirects',
  'robots.txt',
  'license.xml',
  '404.html',
];

export const MANDATORY_ASSET_DIRS = ['assets', 'css', 'js', 'data'];

export const FINDER_DUPLICATE_DIR_RE = /\s[0-9]+$/;
export const FINDER_DUPLICATE_FILE_RE = /\s[0-9]+(?:\.[a-z0-9]+)?$/i;

export function isFinderDuplicateName(name) {
  return FINDER_DUPLICATE_DIR_RE.test(name) || FINDER_DUPLICATE_FILE_RE.test(name);
}

export function shouldExcludeArtifactPath(relPath) {
  const normalized = String(relPath || '').split('\\').join('/');
  return /(?:^|\/)(?:mockup-reference|_archive)(?:\/|$)/i.test(normalized)
    || /(?:^|\/)[^/]*\s[0-9]+(?:\/|$)/i.test(normalized)
    || /\s[0-9]+\.[a-z0-9]+$/i.test(normalized);
}
