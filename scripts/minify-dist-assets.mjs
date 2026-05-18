/**
 * Post-build asset minifier.
 *
 * Astro minifies HTML and the JS/CSS it bundles, but everything copied verbatim
 * from `public/` (all of `/css/*.css` and `/js/*.js`) lands in `dist/` unminified.
 * SEMRUSH flagged ~432 unminified asset references in the May 2026 audit; this
 * script closes that gap by walking dist/ and rewriting CSS/JS files in place.
 *
 * Source files in `public/` stay readable for editing; only the deployed copies
 * in `dist/` are minified.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import * as esbuild from 'esbuild';
import {
    isFinderDuplicateName,
} from './lib/cloudflare-artifact-policy.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

async function walk(dir) {
    const out = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...(await walk(full)));
        } else {
            out.push(full);
        }
    }
    return out;
}

async function findDuplicateDirs(dir) {
    const out = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const full = path.join(dir, entry.name);
        if (isFinderDuplicateName(entry.name)) {
            out.push(full);
            continue;
        }
        out.push(...(await findDuplicateDirs(full)));
    }
    return out;
}

async function minifyFile(file) {
    const ext = path.extname(file);
    const original = await fs.readFile(file, 'utf8');
    let result;
    if (ext === '.css') {
        result = await esbuild.transform(original, { loader: 'css', minify: true });
    } else if (ext === '.js' || ext === '.mjs') {
        result = await esbuild.transform(original, { loader: 'js', minify: true, legalComments: 'none' });
    } else {
        return null;
    }
    if (!result.code) return null;
    if (result.code.length >= original.length) return { file, before: original.length, after: result.code.length, skipped: true };
    await fs.writeFile(file, result.code, 'utf8');
    return { file, before: original.length, after: result.code.length, skipped: false };
}

/**
 * Strip macOS Finder duplicate artifacts ("foo 2.html", "sitemap 3.xml")
 * that get copied through the build. They're indistinguishable to Cloudflare
 * Pages from real routes and create duplicate-content URLs.
 */
async function removeFinderDuplicates(files) {
    const duplicateDirs = new Set(await findDuplicateDirs(distDir));
    let removedFiles = 0;
    for (const f of files) {
        const parts = path.relative(distDir, f).split(path.sep);
        const duplicateDirIndex = parts.findIndex((part, index) => index < parts.length - 1 && isFinderDuplicateName(part));
        if (duplicateDirIndex !== -1) {
            duplicateDirs.add(path.join(distDir, ...parts.slice(0, duplicateDirIndex + 1)));
            continue;
        }
        if (isFinderDuplicateName(path.basename(f))) {
            await fs.unlink(f);
            removedFiles += 1;
        }
    }
    const orderedDirs = Array.from(duplicateDirs).sort((a, b) => b.length - a.length);
    for (const dir of orderedDirs) {
        await fs.rm(dir, { recursive: true, force: true });
    }
    return { files: removedFiles, dirs: orderedDirs.length };
}

async function main() {
    let exists = false;
    try {
        await fs.access(distDir);
        exists = true;
    } catch {}
    if (!exists) {
        console.error(`minify-dist-assets: ${distDir} does not exist — run \`astro build\` first.`);
        process.exit(1);
    }

    let all = await walk(distDir);
    const dupesRemoved = await removeFinderDuplicates(all);
    if (dupesRemoved.files > 0 || dupesRemoved.dirs > 0) {
        console.log(`Removed ${dupesRemoved.files} macOS Finder duplicate file(s) and ${dupesRemoved.dirs} duplicate director${dupesRemoved.dirs === 1 ? 'y' : 'ies'} from dist/.`);
        all = await walk(distDir);
    }
    const targets = all.filter((f) => /\.(css|js|mjs)$/.test(f));

    let totalBefore = 0;
    let totalAfter = 0;
    let minified = 0;
    let skipped = 0;
    let errors = 0;

    for (const file of targets) {
        try {
            const r = await minifyFile(file);
            if (!r) continue;
            totalBefore += r.before;
            totalAfter += r.after;
            if (r.skipped) skipped += 1;
            else minified += 1;
        } catch (err) {
            errors += 1;
            console.error(`minify failed: ${path.relative(distDir, file)} — ${err.message}`);
        }
    }

    const saved = totalBefore - totalAfter;
    const pct = totalBefore ? ((saved / totalBefore) * 100).toFixed(1) : '0.0';
    console.log(
        `Minified ${minified} files (${(totalBefore / 1024).toFixed(1)}KB → ${(totalAfter / 1024).toFixed(1)}KB, saved ${(saved / 1024).toFixed(1)}KB / ${pct}%); skipped ${skipped} (no gain); errors ${errors}.`,
    );

    // Mirror the canonical Astro-generated sitemap back to the repo root so
    // legacy validators (scripts/check-sitemap.js, check-route-contract.js)
    // that read root/sitemap.xml stay in sync without separate maintenance.
    const distSitemap = path.resolve(distDir, 'sitemap.xml');
    const rootSitemap = path.resolve(distDir, '..', 'sitemap.xml');
    try {
        await fs.copyFile(distSitemap, rootSitemap);
        console.log(`Mirrored ${path.basename(distSitemap)} → ${path.relative(path.resolve(distDir, '..'), rootSitemap)}.`);
    } catch (err) {
        console.warn(`Could not mirror sitemap.xml: ${err.message}`);
    }

    if (errors > 0) process.exit(1);
}

main();
