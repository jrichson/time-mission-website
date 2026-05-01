/**
 * Hero / groups MP4s may live on R2 (Pages file-size limit). Template fragments use
 * `{{TM_MEDIA_BASE}}` so Astro can substitute at build time.
 */
export function tmMediaBase(): string {
    const raw = import.meta.env.PUBLIC_TM_MEDIA_BASE;
    if (!raw || typeof raw !== 'string') return '';
    return raw.replace(/\/$/, '');
}

export function applyTmMediaBase(fragment: string): string {
    return fragment.replaceAll('{{TM_MEDIA_BASE}}', tmMediaBase());
}
