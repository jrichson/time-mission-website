/**
 * Consent Mode v2 — programmatic updates for a future CMP.
 * Default consent is set in SiteHead (Astro) before GTM loads.
 */
(function () {
    'use strict';

    window.TMConsent = {
        /**
         * @param {Record<string, string>} settings Consent Mode fields, e.g. { analytics_storage: 'granted' }
         */
        update: function (settings) {
            if (typeof window.gtag !== 'function') return;
            window.gtag('consent', 'update', settings || {});
        },
    };
})();
