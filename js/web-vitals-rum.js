/**
 * Phase 10 P2-1 — Web Vitals RUM beacon
 * Measures LCP / CLS / INP via the web-vitals attribution build and pushes
 * normalized non-PII events to window.dataLayer for GTM consumption.
 *
 * Consent gate: only initializes when window.__TM_CONSENT_STATE__.analytics_storage
 * === 'granted'. Set by SiteHead.astro Phase 6 init or by cookie banner accept
 * (plan 10-06).
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;

    function consentGranted() {
        try {
            var s = window.__TM_CONSENT_STATE__;
            return s && s.analytics_storage === 'granted';
        } catch (e) {
            return false;
        }
    }

    function sendToDataLayer(metric) {
        try {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'web_vitals',
                web_vitals_name: metric.name,
                web_vitals_delta: Math.round(metric.delta),
                web_vitals_value: Math.round(metric.value),
                web_vitals_rating: metric.rating,
                web_vitals_id: metric.id,
            });
        } catch (e) {
            // Fail silently — RUM should never break the page
        }
    }

    var initialized = false;
    function initialize() {
        if (initialized) return;
        var wv = window.webVitals;
        if (!wv || typeof wv.onLCP !== 'function') return;
        wv.onLCP(sendToDataLayer);
        wv.onCLS(sendToDataLayer);
        wv.onINP(sendToDataLayer);
        initialized = true;
    }

    if (consentGranted()) {
        initialize();
    } else {
        // Listen for consent updates (Phase 6 + cookie banner from plan 10-06)
        window.addEventListener('tm:consent-updated', function () {
            if (consentGranted()) initialize();
        });
    }
})();
