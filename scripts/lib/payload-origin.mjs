/** Keep in sync with `src/lib/payload/cms-origin.ts` — PAYLOAD_FETCH_TIMEOUT_MS */
export const PAYLOAD_FETCH_TIMEOUT_MS = 15_000;

/**
 * Mirrors `src/lib/payload/cms-origin.ts` — update both files together.
 */

export function validatedCmsOriginBase(raw) {
  const trimmed = String(raw ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  if (!u.hostname) return null;

  const allowRaw = process.env.PAYLOAD_CMS_ALLOWED_HOSTS || '';
  const allow = allowRaw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length > 0) {
    const host = u.hostname.toLowerCase();
    const ok = allow.some((a) => host === a || host.endsWith(`.${a}`));
    if (!ok) return null;
  }

  return u.origin;
}
