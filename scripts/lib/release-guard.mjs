/**
 * Pure helpers for scripts/release.mjs and scripts/verify-live.mjs.
 * Everything here takes plain values so it can be unit tested without git,
 * Railway, Cloudflare, or the network.
 */

/**
 * A release must be an exact, pushed commit. Tracked edits are refused because
 * the release builds from a fresh checkout and would silently leave them out.
 */
export function gitReleaseProblems({ branch, statusPorcelain, head, upstreamHead }) {
  const problems = [];
  if (!branch) problems.push('HEAD is detached. Check out the branch you want to release.');
  const trackedChanges = String(statusPorcelain || '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith('??'));
  if (trackedChanges.length) {
    problems.push(
      `Uncommitted changes to tracked files (commit or stash them first):\n${trackedChanges
        .map((line) => `    ${line}`)
        .join('\n')}`,
    );
  }
  if (!upstreamHead) {
    problems.push(`Branch ${branch || '(detached)'} has no pushed copy on origin. Push it first.`);
  } else if (head !== upstreamHead) {
    problems.push(
      `HEAD ${short(head)} does not match origin/${branch} ${short(upstreamHead)}. Push or pull first.`,
    );
  }
  return problems;
}

/**
 * Decide whether the CMS must be redeployed. Unknown live state always deploys,
 * because skipping a needed CMS migration is the failure we are guarding against.
 */
export function cmsDeployDecision({ mode = 'auto', liveCommit, cmsChangedSinceLive }) {
  if (mode === 'skip') return { deploy: false, reason: 'skipped with --cms=skip' };
  if (mode === 'force') return { deploy: true, reason: 'forced with --cms=force' };
  if (!liveCommit) return { deploy: true, reason: 'live site does not report its release commit' };
  if (cmsChangedSinceLive === null) {
    return { deploy: true, reason: `live commit ${short(liveCommit)} is not in local history` };
  }
  return cmsChangedSinceLive
    ? { deploy: true, reason: `cms/ changed since live commit ${short(liveCommit)}` }
    : { deploy: false, reason: `cms/ unchanged since live commit ${short(liveCommit)}` };
}

/** Newest deployment first, as returned by `railway deployment list --json`. */
export function newestRailwayDeployment(deployments, knownIds = new Set()) {
  const list = Array.isArray(deployments) ? deployments : [];
  const fresh = list.filter((deployment) => deployment?.id && !knownIds.has(deployment.id));
  fresh.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return fresh[0] || null;
}

export const RAILWAY_TERMINAL_FAILURES = new Set(['FAILED', 'CRASHED', 'REMOVED', 'SKIPPED']);

/** `wrangler d1 list --json` can print a banner line before the JSON array. */
export function d1DatabaseId(output, name, jurisdiction) {
  const text = String(output || '');
  const start = text.indexOf('[');
  if (start === -1) return null;
  let databases;
  try {
    databases = JSON.parse(text.slice(start));
  } catch {
    return null;
  }
  const match = databases.find(
    (database) => database?.name === name && (!jurisdiction || database?.jurisdiction === jurisdiction),
  );
  return match?.uuid || null;
}

/**
 * The full CSP lives in each page's meta tag. A stricter response-header CSP is
 * enforced together with it and silently blocks GTM tags (the 2026-09-25 outage).
 */
export function headerCspProblems(headerValue) {
  const value = String(headerValue || '').trim();
  if (!value) return ['missing Content-Security-Policy response header (expected frame-ancestors only)'];
  const directives = value.split(';').map((directive) => directive.trim()).filter(Boolean);
  const extra = directives.filter((directive) => !directive.startsWith('frame-ancestors'));
  return extra.length
    ? [`Content-Security-Policy response header must only set frame-ancestors; found: ${extra.join('; ')}`]
    : [];
}

export const REQUIRED_TRACKING_SCRIPT_HOSTS = [
  'https://www.googletagmanager.com',
  'https://connect.facebook.net',
  'https://analytics.tiktok.com',
];

/** Checks the static HTML of a page for the tracking contract. */
export function pageTrackingProblems(html, { gtmId }) {
  const problems = [];
  const source = String(html || '');
  const meta = source.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i)?.[0] || '';
  if (!meta) problems.push('missing CSP meta tag');
  const scriptElem = meta.match(/script-src-elem ([^;"]+)/)?.[1] || '';
  for (const host of REQUIRED_TRACKING_SCRIPT_HOSTS) {
    if (meta && !scriptElem.split(/\s+/).includes(host)) {
      problems.push(`CSP script-src-elem is missing ${host}`);
    }
  }
  if (gtmId && !source.includes(gtmId)) problems.push(`page does not load ${gtmId}`);
  return problems;
}

function short(sha) {
  return String(sha || '').slice(0, 7) || '(none)';
}
