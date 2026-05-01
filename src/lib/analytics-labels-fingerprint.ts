/**
 * Stable fingerprint for analytics label maps (RFC #9 spine).
 * SYNC: Must match fingerprintAnalyticsLabels in scripts/lib/analytics-labels-fingerprint.cjs;
 * Node callers (checks, smoke) should require the .cjs module.
 */
import type analyticsLabelsRaw from '../data/site/analytics-labels.json';

export type AnalyticsLabels = typeof analyticsLabelsRaw;

export function fingerprintAnalyticsLabels(labels: AnalyticsLabels): string {
    const canonical = JSON.stringify(labels);
    let h = 0;
    for (let i = 0; i < canonical.length; i++) {
        h = (Math.imul(31, h) + canonical.charCodeAt(i)) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}
