'use strict';

/**
 * Stable fingerprint for analytics label maps (site contract spine).
 * SYNC: Must match fingerprintAnalyticsLabels in src/lib/analytics-labels-fingerprint.ts
 */
function fingerprintAnalyticsLabels(labels) {
  const canonical = JSON.stringify(labels);
  let h = 0;
  for (let i = 0; i < canonical.length; i++) {
    h = (Math.imul(31, h) + canonical.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

module.exports = { fingerprintAnalyticsLabels };
