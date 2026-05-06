/**
 * Per-page last-updated resolution with override > git mtime > build-date fallback.
 *
 * Used by SiteLayout to render a visible "Last updated: <Month YYYY>" stamp and
 * emit a <meta name="last-modified"> tag for AI/SEO freshness signal.
 *
 * Note on path resolution during Astro builds: Vite compiles all modules (including
 * this lib) into bundled chunks, making import.meta.url unreliable for locating the
 * repo root. We use process.cwd() instead — Astro always runs builds from the repo root.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/**
 * Map a canonicalPath (e.g. `/about`, `/groups/birthdays`, `/`) to the source .astro file path.
 */
function canonicalToSourceFile(canonicalPath: string): string {
    const slug = canonicalPath === '/' ? 'index' : canonicalPath.slice(1);
    return join(process.cwd(), 'src', 'pages', `${slug}.astro`);
}

export interface LastUpdatedInfo {
    iso: string;    // YYYY-MM-DD (what goes in <time datetime="..."> and <meta>)
    human: string;  // "Last updated: May 2026"
    source: 'override' | 'git' | 'build';
}

export interface ResolveLastUpdatedInput {
    /** Optional explicit override from definePage(). MUST be 'YYYY-MM-DD'. */
    override?: string;
    /**
     * The canonicalPath of the page (e.g. '/about', '/groups/birthdays').
     * Used to resolve the source .astro file for git mtime lookup.
     * Preferred over sourceFile — avoids Vite import.meta.url compilation issues.
     */
    canonicalPath?: string;
    /**
     * Absolute path or file:// URL to the page source file.
     * Falls back to this if canonicalPath is not provided or yields no git date.
     */
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

function gitMtimeForFile(filePath: string): string | null {
    try {
        const out = execFileSync(
            'git',
            ['log', '-1', '--format=%cs', '--', filePath],
            { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' },
        ).trim();
        if (out && ISO_RE.test(out)) return out;
    } catch {
        // git not found, file not tracked, non-git env — silently fall through
    }
    return null;
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

    // 2a. Git mtime via canonicalPath → src/pages/{slug}.astro (preferred)
    if (input.canonicalPath) {
        const filePath = canonicalToSourceFile(input.canonicalPath);
        const iso = gitMtimeForFile(filePath);
        if (iso) return { iso, human: formatLastUpdatedHuman(iso), source: 'git' };
    }

    // 2b. Git mtime via explicit sourceFile path
    if (input.sourceFile) {
        let filePath = input.sourceFile;
        if (filePath.startsWith('file://')) {
            filePath = fileURLToPath(filePath);
        }
        const iso = gitMtimeForFile(filePath);
        if (iso) return { iso, human: formatLastUpdatedHuman(iso), source: 'git' };
    }

    // 3. Build date fallback
    const iso = new Date().toISOString().slice(0, 10);
    return { iso, human: formatLastUpdatedHuman(iso), source: 'build' };
}
