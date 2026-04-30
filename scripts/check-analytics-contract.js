'use strict';

/**
 * ANLY-04 — drift + PII guards for analytics runtime scripts.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

const labelPath = path.join(root, 'src', 'data', 'site', 'analytics-labels.json');
const analyticsJs = path.join(root, 'js', 'analytics.js');
const contactJs = path.join(root, 'js', 'contact-form-analytics.js');

function read(p) {
    return fs.readFileSync(p, 'utf8');
}

function extractEmbedObject(jsText) {
    const startPat = 'var TM_ANALYTICS_LABELS_EMBED = ';
    const i = jsText.indexOf(startPat);
    if (i === -1) {
        errors.push('js/analytics.js missing TM_ANALYTICS_LABELS_EMBED');
        return null;
    }
    let depth = 0;
    let start = i + startPat.length;
    let end = -1;
    for (let j = start; j < jsText.length; j++) {
        const c = jsText[j];
        if (c === '{') depth++;
        if (c === '}') {
            depth--;
            if (depth === 0) {
                end = j + 1;
                break;
            }
        }
    }
    if (end === -1) {
        errors.push('Could not parse TM_ANALYTICS_LABELS_EMBED braces');
        return null;
    }
    const raw = jsText.slice(start, end).trim();
    let obj;
    try {
        obj = Function('"use strict"; return (' + raw + ')')();
    } catch (e) {
        errors.push('TM_ANALYTICS_LABELS_EMBED parse error: ' + e.message);
        return null;
    }
    return obj;
}

function deepEqualEmbed(jsonFromFile, embed) {
    if (!embed || !embed.eventNames || !embed.parameters) {
        errors.push('TM_ANALYTICS_LABELS_EMBED must have eventNames and parameters');
        return;
    }
    const jn = jsonFromFile.eventNames;
    const en = embed.eventNames;
    for (const k of Object.keys(jn)) {
        if (en[k] !== jn[k]) {
            errors.push(`eventNames.${k} mismatch (json vs analytics.js embed)`);
        }
    }
    for (const k of Object.keys(en)) {
        if (!Object.prototype.hasOwnProperty.call(jn, k)) {
            errors.push(`analytics.js embed has extra eventNames.${k}`);
        }
    }
    const jp = jsonFromFile.parameters;
    const ep = embed.parameters;
    for (const k of Object.keys(jp)) {
        if (ep[k] !== jp[k]) {
            errors.push(`parameters.${k} mismatch (json vs analytics.js embed)`);
        }
    }
    for (const k of Object.keys(ep)) {
        if (!Object.prototype.hasOwnProperty.call(jp, k)) {
            errors.push(`analytics.js embed has extra parameters.${k}`);
        }
    }
}

const banned = [/email\s*:/i, /['"]email['"]\s*:/i, /\bphone\s*:/i, /['"]message['"]\s*:/i];

function scanNoPii(filePath, label) {
    if (!fs.existsSync(filePath)) {
        errors.push(`Missing file: ${label}`);
        return;
    }
    const text = read(filePath);
    for (const re of banned) {
        if (re.test(text)) {
            errors.push(`${label} contains disallowed PII-like payload pattern (${re})`);
        }
    }
}

if (!fs.existsSync(labelPath)) errors.push(`Missing ${labelPath}`);
if (!fs.existsSync(analyticsJs)) errors.push('Missing js/analytics.js');

if (!errors.length) {
    const json = JSON.parse(read(labelPath));
    const embed = extractEmbedObject(read(analyticsJs));
    if (embed) deepEqualEmbed(json, embed);
}

scanNoPii(analyticsJs, 'js/analytics.js');
scanNoPii(contactJs, 'js/contact-form-analytics.js');

if (errors.length) {
    console.error('Analytics contract check failed:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
}

console.log('Analytics contract check passed (labels embed + PII scan).');
