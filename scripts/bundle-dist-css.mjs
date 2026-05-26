/**
 * Post-build CSS bundler.
 *
 * Source CSS stays split by responsibility for maintainability. After Astro has
 * copied and minified CSS into dist/, this script rewrites generated HTML to
 * load one shared site-core bundle plus one route-specific bundle when needed.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import url from 'node:url';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { stylesheetLinks } = require('./lib/html-link-parser.cjs');
const siteCssAssets = require('../src/data/site/site-css-assets.json');
const distDir = path.resolve(__dirname, '..', 'dist');
const bundleDir = path.join(distDir, 'css', 'bundles');

const SITE_CORE_CSS = siteCssAssets.core.map((href) => new URL(href, 'https://timemission.local').pathname);

const siteCoreSet = new Set(SITE_CORE_CSS);

async function walkHtml(dir) {
    const out = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (path.relative(distDir, full).startsWith(`assets${path.sep}extracted`)) continue;
            out.push(...(await walkHtml(full)));
        } else if (entry.name.endsWith('.html')) {
            out.push(full);
        }
    }
    return out;
}

function distCssPath(pathname) {
    if (!pathname.startsWith('/css/')) return null;
    return path.join(distDir, pathname.slice(1));
}

function rewriteCssUrls(css, sourcePathname) {
    const sourceDir = path.posix.dirname(sourcePathname);
    return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, quote, rawUrl) => {
        const assetUrl = String(rawUrl || '').trim();
        if (
            !assetUrl ||
            assetUrl.startsWith('/') ||
            assetUrl.startsWith('#') ||
            /^[a-z][a-z0-9+.-]*:/i.test(assetUrl)
        ) {
            return match;
        }
        const absolute = path.posix.normalize(path.posix.join(sourceDir, assetUrl));
        return `url(${quote || ''}${absolute.startsWith('/') ? absolute : `/${absolute}`}${quote || ''})`;
    });
}

function hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
}

async function readCss(pathnames) {
    const parts = [];
    for (const pathname of pathnames) {
        const file = distCssPath(pathname);
        if (!file) throw new Error(`${pathname}: expected a /css/ path`);
        try {
            parts.push(rewriteCssUrls(await fs.readFile(file, 'utf8'), pathname));
        } catch (err) {
            throw new Error(`${pathname}: ${err.message}`);
        }
    }
    return parts.join('\n');
}

async function writeBundle(pathnames, name) {
    const raw = await readCss(pathnames);
    const result = await esbuild.transform(raw, {
        loader: 'css',
        minify: true,
        legalComments: 'none',
    });
    const code = result.code || raw;
    const hash = hashContent(code);
    const fileName = `${name}.${hash}.css`;
    const abs = path.join(bundleDir, fileName);
    await fs.writeFile(abs, code, 'utf8');
    return {
        href: `/css/bundles/${fileName}`,
        bytes: code.length,
    };
}

function bundleAbsPath(pathname) {
    return path.join(distDir, pathname.slice(1));
}

function replaceLinks(html, replacements) {
    let out = html;
    const ordered = replacements.sort((a, b) => b.start - a.start);
    for (const replacement of ordered) {
        out = `${out.slice(0, replacement.start)}${replacement.value}${out.slice(replacement.end)}`;
    }
    return out;
}

function assertSiteCoreSequence(htmlFile, siteCoreLinks) {
    const found = siteCoreLinks.map((link) => link.pathname);
    if (found.length !== SITE_CORE_CSS.length || found.some((pathname, index) => pathname !== SITE_CORE_CSS[index])) {
        const rel = path.relative(distDir, htmlFile);
        throw new Error(`${rel}: site core CSS links do not match the expected bundle sequence`);
    }
}

async function assertNoExistingBundleLinks(htmlFiles) {
    const offenders = [];
    for (const htmlFile of htmlFiles) {
        const html = await fs.readFile(htmlFile, 'utf8');
        const rel = path.relative(distDir, htmlFile);
        const bundleLinks = stylesheetLinks(html)
            .filter((link) => link.pathname.startsWith('/css/bundles/'))
            .map((link) => link.pathname);

        if (bundleLinks.length) {
            offenders.push(`${rel}: ${bundleLinks.join(', ')}`);
        }
    }

    if (offenders.length) {
        throw new Error(
            'dist already contains bundled CSS links. Run the full clean build (`npm run build:astro`) before bundling.\n' +
            offenders.join('\n'),
        );
    }
}

async function assertReferencedBundlesExist(htmlFiles) {
    const missing = [];
    for (const htmlFile of htmlFiles) {
        const html = await fs.readFile(htmlFile, 'utf8');
        const rel = path.relative(distDir, htmlFile);
        const links = stylesheetLinks(html).filter((link) => link.pathname.startsWith('/css/bundles/'));

        for (const link of links) {
            const file = bundleAbsPath(link.pathname);
            try {
                const stat = await fs.stat(file);
                if (!stat.isFile() || stat.size === 0) {
                    missing.push(`${rel}: ${link.pathname}`);
                }
            } catch {
                missing.push(`${rel}: ${link.pathname}`);
            }
        }
    }

    if (missing.length) {
        throw new Error(`Missing CSS bundle file(s):\n${missing.join('\n')}`);
    }
}

async function main() {
    try {
        await fs.access(distDir);
    } catch {
        console.error(`bundle-dist-css: ${distDir} does not exist — run \`astro build\` first.`);
        process.exit(1);
    }

    const htmlFiles = await walkHtml(distDir);
    await assertNoExistingBundleLinks(htmlFiles);

    await fs.rm(bundleDir, { recursive: true, force: true });
    await fs.mkdir(bundleDir, { recursive: true });

    const siteCore = await writeBundle(SITE_CORE_CSS, 'site-core');
    let rewritten = 0;
    let beforeLinks = 0;
    let afterLinks = 0;
    const routeBundleBytes = new Map();

    for (const htmlFile of htmlFiles) {
        const html = await fs.readFile(htmlFile, 'utf8');
        const links = stylesheetLinks(html);
        const localCssLinks = links.filter((link) => link.pathname.startsWith('/css/') && !link.pathname.startsWith('/css/bundles/'));
        if (!localCssLinks.length) continue;

        const siteCoreLinks = localCssLinks.filter((link) => siteCoreSet.has(link.pathname));
        assertSiteCoreSequence(htmlFile, siteCoreLinks);

        const pageCssLinks = localCssLinks.filter((link) => !siteCoreSet.has(link.pathname));
        const replacements = siteCoreLinks.map((link, index) => ({
            start: link.start,
            end: link.end,
            value: index === 0 ? `<link rel="stylesheet" href="${siteCore.href}">` : '',
        }));

        let pageBundle = null;
        if (pageCssLinks.length) {
            pageBundle = await writeBundle(pageCssLinks.map((link) => link.pathname), 'route');
            routeBundleBytes.set(pageBundle.href, pageBundle.bytes);
            replacements.push(...pageCssLinks.map((link, index) => ({
                start: link.start,
                end: link.end,
                value: index === 0 ? `<link rel="stylesheet" href="${pageBundle.href}">` : '',
            })));
        }

        const nextHtml = replaceLinks(html, replacements);
        await fs.writeFile(htmlFile, nextHtml, 'utf8');
        rewritten += 1;
        beforeLinks += localCssLinks.length;
        afterLinks += 1 + (pageBundle ? 1 : 0);
    }

    await assertReferencedBundlesExist(htmlFiles);

    const routeBundleTotal = Array.from(routeBundleBytes.values()).reduce((sum, bytes) => sum + bytes, 0);
    console.log(
        `Bundled CSS for ${rewritten} HTML file(s): ${beforeLinks} stylesheet link(s) → ${afterLinks}; ` +
        `site-core ${(siteCore.bytes / 1024).toFixed(1)}KB, ${routeBundleBytes.size} route bundle(s) ${(routeBundleTotal / 1024).toFixed(1)}KB total.`,
    );
}

main().catch((err) => {
    console.error(`bundle-dist-css: ${err.message}`);
    process.exit(1);
});
