/**
 * Per-page last-updated resolution with override > git mtime > build-date fallback.
 *
 * Used by SiteLayout to render a visible "Last updated: <Month YYYY>" stamp and
 * emit a <meta name="last-modified"> tag for AI/SEO freshness signal.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export interface LastUpdatedInfo {
    iso: string;    // YYYY-MM-DD (what goes in <time datetime="..."> and <meta>)
    human: string;  // "Last updated: May 2026"
    source: 'override' | 'git' | 'build';
}

export interface ResolveLastUpdatedInput {
    /** Optional explicit override from definePage(). MUST be 'YYYY-MM-DD'. */
    override?: string;
    /** Absolute path or file:// URL to the page's source .astro file (typically import.meta.url). Optional; if absent, build date is used. */
    sourceFile?: string;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatLastUpdatedHuman(iso: string): string {
    const formatted = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(iso + 'T00:00:00Z'));
    return `Last updated: ${formatted}`;
}

export function resolveLastUpdated(input: ResolveLastUpdatedInput): LastUpdatedInfo {
    // 1. Override path
    if (input.override !== undefined) {
        if (!ISO_RE.test(input.override)) {
            throw new Error(
                `resolveLastUpdated: override must be YYYY-MM-DD, got ${input.override}`,
            );
        }
        const iso = input.override;
        return { iso, human: formatLastUpdatedHuman(iso), source: 'override' };
    }

    // 2. Git mtime path
    if (input.sourceFile) {
        try {
            let filePath = input.sourceFile;
            if (filePath.startsWith('file://')) {
                filePath = fileURLToPath(filePath);
            }
            const out = execFileSync(
                'git',
                ['log', '-1', '--format=%cs', '--', filePath],
                { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' },
            ).trim();
            if (out && ISO_RE.test(out)) {
                return { iso: out, human: formatLastUpdatedHuman(out), source: 'git' };
            }
        } catch {
            // git not found, file not tracked, or other failure — fall through to build date
        }
    }

    // 3. Build date fallback
    const iso = new Date().toISOString().slice(0, 10);
    return { iso, human: formatLastUpdatedHuman(iso), source: 'build' };
}
