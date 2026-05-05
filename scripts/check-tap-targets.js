/**
 * Phase 10 P1-1 — Static CSS tap-target audit (heuristic).
 *
 * Reads `css/base.css` and `css/nav.css` and asserts that the tap-target
 * minimums declared in UI-SPEC (Tap Target Minimums table) are present in
 * the source CSS for the documented selectors.
 *
 * NOTE: This is a STATIC HEURISTIC. The validator parses CSS source and
 * estimates an effective minimum height from `min-height`, `height`, or
 * `padding + line-height + font-size`. The DEFINITIVE measurement is a
 * runtime Playwright check — see plan 10-06 Task 2 for the human-driven
 * desktop-viewport spot check on `.btn-tickets` and `.btn-primary`.
 *
 * Validator scope is intentionally limited to shared CSS (`css/base.css` and
 * `css/nav.css`) per UI-SPEC line 642-660. Selectors that only exist in page
 * inline CSS (e.g. `.btn-primary` in `src/partials/*-inline.raw.css.txt`) are
 * skipped with an informational note, not flagged as failures.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];
const skipped = [];

const REQUIRES_44PX = [
    '.nav-menu-btn',
    '.location-btn',
    '.location-dropdown-close',
    '.mobile-menu-socials a',
    '.btn-secondary',
    '.mobile-menu-links a',
];

const REQUIRES_48PX = [
    '.btn-tickets',
    '.btn-primary',
    '.mobile-menu-cta a',
];

const baseCss = fs.readFileSync(path.join(root, 'css', 'base.css'), 'utf8');
const navCss = fs.readFileSync(path.join(root, 'css', 'nav.css'), 'utf8');

const REM_PX = 16;

function toPx(value) {
    if (!value) return null;
    const trimmed = String(value).trim();
    const remMatch = trimmed.match(/^([\d.]+)\s*rem$/i);
    if (remMatch) return parseFloat(remMatch[1]) * REM_PX;
    const pxMatch = trimmed.match(/^([\d.]+)\s*px$/i);
    if (pxMatch) return parseFloat(pxMatch[1]);
    const numMatch = trimmed.match(/^([\d.]+)$/);
    if (numMatch) return parseFloat(numMatch[1]);
    return null;
}

function findAllRulesets(css, selector, fileName) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(?:^|})[\\s\\n]*' + escaped + '\\s*[,{]', 'gm');
    const results = [];
    let match;
    while ((match = re.exec(css)) !== null) {
        const selectorIdx = match.index + match[0].indexOf(selector);
        const startIdx = css.indexOf('{', selectorIdx);
        if (startIdx === -1) continue;
        let depth = 1;
        let i = startIdx + 1;
        while (i < css.length && depth > 0) {
            if (css[i] === '{') depth += 1;
            else if (css[i] === '}') depth -= 1;
            i += 1;
        }
        const block = css.slice(startIdx + 1, i - 1);
        const lineNumber = css.slice(0, selectorIdx).split('\n').length;
        const lineStart = css.lastIndexOf('\n', selectorIdx) + 1;
        const indent = selectorIdx - lineStart;
        results.push({ block, fileName, line: lineNumber, indent });
    }
    return results;
}

function pickPrimaryRuleset(rulesets) {
    if (rulesets.length === 0) return null;
    // A `display: none` ruleset declares the element is unrendered at that breakpoint —
    // look elsewhere for the actually-rendered tap target's size.
    const rendered = rulesets.filter((r) => !/display\s*:\s*none/i.test(r.block));
    if (rendered.length === 0) {
        // Selector is display:none everywhere we found it — no rendered tap target to enforce.
        return rulesets[0];
    }
    const topLevel = rendered.filter((r) => r.indent === 0);
    const candidates = topLevel.length > 0 ? topLevel : rendered;
    function score(r) {
        let s = 0;
        if (/min-height\s*:/i.test(r.block)) s += 10;
        if (/\bheight\s*:/i.test(r.block)) s += 5;
        if (/padding[^;}]/i.test(r.block)) s += 3;
        if (/font-size\s*:/i.test(r.block)) s += 1;
        return s;
    }
    return candidates.reduce((best, cur) => (score(cur) > score(best) ? cur : best), candidates[0]);
}


function getDeclaration(block, prop) {
    const re = new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;}]+)', 'i');
    const m = block.match(re);
    return m ? m[1].trim() : null;
}

function estimateHeight(rule) {
    const minHeight = toPx(getDeclaration(rule.block, 'min-height'));
    if (minHeight !== null) return { px: minHeight, source: 'min-height' };

    const height = toPx(getDeclaration(rule.block, 'height'));
    if (height !== null) return { px: height, source: 'height' };

    const padShorthand = getDeclaration(rule.block, 'padding');
    const padTop = toPx(getDeclaration(rule.block, 'padding-top'));
    const padBottom = toPx(getDeclaration(rule.block, 'padding-bottom'));

    let verticalPadding = null;
    if (padTop !== null && padBottom !== null) {
        verticalPadding = padTop + padBottom;
    } else if (padShorthand) {
        const parts = padShorthand.split(/\s+/).map(toPx).filter((v) => v !== null);
        if (parts.length === 1) verticalPadding = parts[0] * 2;
        else if (parts.length === 2 || parts.length === 3) verticalPadding = parts[0] * 2;
        else if (parts.length >= 4) verticalPadding = parts[0] + parts[2];
    }

    if (verticalPadding === null) {
        return { px: null, source: 'unknown' };
    }

    const fontSizeDecl = getDeclaration(rule.block, 'font-size');
    const fontSize = toPx(fontSizeDecl);
    const fontPx = fontSize !== null ? fontSize : 16;
    const lineHeight = 1.4;
    const textHeight = fontPx * lineHeight;

    return {
        px: verticalPadding + textHeight,
        source: `padding(${verticalPadding}px) + line-height-est(${Math.round(textHeight)}px)`,
    };
}

function checkSelector(selector, requiredPx) {
    const rulesets = [
        ...findAllRulesets(navCss, selector, 'css/nav.css'),
        ...findAllRulesets(baseCss, selector, 'css/base.css'),
    ];
    const rule = pickPrimaryRuleset(rulesets);
    if (!rule) {
        skipped.push(`${selector}: not found in css/base.css or css/nav.css (may be page-local; skipped)`);
        return;
    }
    const est = estimateHeight(rule);
    if (est.px === null) {
        errors.push(
            `${selector} (${rule.fileName}:${rule.line}): could not estimate height — declares no min-height/height/padding; please add explicit min-height: ${requiredPx}px`,
        );
        return;
    }
    if (est.px < requiredPx) {
        errors.push(
            `${selector} (${rule.fileName}:${rule.line}): estimated height ${Math.round(est.px)}px [${est.source}] < required ${requiredPx}px; add explicit min-height: ${requiredPx}px`,
        );
    }
}

for (const sel of REQUIRES_44PX) checkSelector(sel, 44);
for (const sel of REQUIRES_48PX) checkSelector(sel, 48);

if (errors.length > 0) {
    console.error('check-tap-targets failed:');
    for (const e of errors) console.error('- ' + e);
    process.exit(1);
}

const total = REQUIRES_44PX.length + REQUIRES_48PX.length;
const validated = total - skipped.length;
console.log(`check-tap-targets passed: ${validated}/${total} selectors validated against css/base.css + css/nav.css.`);
if (skipped.length > 0) {
    for (const s of skipped) console.log('  note: ' + s);
}
