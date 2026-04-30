'use strict';

/**
 * Consent hardening guardrails for ANLY consent profile behavior.
 *
 * Verifies:
 * - Site head exposes consent profile + startup tagging config.
 * - Consent bridge updates shared consent state + emits update event.
 * - Analytics runtime gates/clears attribution when consent disallows it.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

const siteHeadPath = path.join(root, 'src', 'components', 'SiteHead.astro');
const analyticsPath = path.join(root, 'js', 'analytics.js');
const consentBridgePath = path.join(root, 'js', 'consent-bridge.js');

function read(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function requireIncludes(text, label, requiredFragments) {
    for (const frag of requiredFragments) {
        if (!text.includes(frag)) {
            errors.push(`${label} missing required fragment: ${frag}`);
        }
    }
}

if (!fs.existsSync(siteHeadPath)) errors.push('Missing src/components/SiteHead.astro');
if (!fs.existsSync(analyticsPath)) errors.push('Missing js/analytics.js');
if (!fs.existsSync(consentBridgePath)) errors.push('Missing js/consent-bridge.js');

if (!errors.length) {
    const siteHead = read(siteHeadPath);
    const analytics = read(analyticsPath);
    const consentBridge = read(consentBridgePath);

    requireIncludes(siteHead, 'SiteHead.astro', [
        "type ConsentProfile = 'eu_strict' | 'us_open' | 'global_strict';",
        "window.__TM_CONSENT_STATE__ = Object.assign({}, consentDefaults);",
        "event: 'tm_tagging_config'",
        'consent_profile',
    ]);

    requireIncludes(consentBridge, 'js/consent-bridge.js', [
        'window.__TM_CONSENT_STATE__ = Object.assign({}, current, update);',
        "new CustomEvent('tm:consent-updated'",
    ]);

    requireIncludes(analytics, 'js/analytics.js', [
        "var CONSENT_CHANGE_EVENT = 'tm:consent-updated';",
        'function canPersistAttribution()',
        'if (!canPersistAttribution()) {',
        'clearAttribution();',
        'document.addEventListener(CONSENT_CHANGE_EVENT, refreshAttributionState);',
    ]);
}

if (errors.length) {
    console.error('Consent contract check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
}

console.log('Consent contract check passed (profile + state + gating).');
