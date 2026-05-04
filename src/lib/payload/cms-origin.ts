/** Build-time checks for Payload base URL — keep `scripts/lib/payload-origin.mjs` aligned with this logic. */

export const PAYLOAD_FETCH_TIMEOUT_MS = 15_000;

export function cmsBuildStrict(): boolean {
    const v = typeof process !== 'undefined' ? process.env.PAYLOAD_CMS_BUILD_STRICT : undefined;
    return v === '1' || /^true$/i.test(String(v ?? ''));
}

/**
 * Parses and validates CMS origin used for SSR fetches only.
 * - http(s) only, rejects non-HTTP schemes (javascript:, blob:, etc.)
 * - rejects userinfo (@ credentials)
 * - optional comma-separated host allowlist via PAYLOAD_CMS_ALLOWED_HOSTS (subdomains match: host === entry || host.endsWith('.' + entry))
 */
export function validatedCmsOriginBase(raw: string): string | null {
    const trimmed = String(raw ?? '').trim().replace(/\/+$/, '');
    if (!trimmed) return null;

    let u: URL;
    try {
        u = new URL(trimmed);
    } catch {
        return null;
    }

    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    if (!u.hostname) return null;

    const allowRaw =
        typeof process !== 'undefined' && process.env.PAYLOAD_CMS_ALLOWED_HOSTS
            ? process.env.PAYLOAD_CMS_ALLOWED_HOSTS
            : '';
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
