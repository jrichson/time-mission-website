/**
 * Consent Mode v2 — programmatic updates for a future CMP.
 * Default consent is set in SiteHead (Astro) before GTM loads.
 */
(function () {
    'use strict';

    function emitConsentUpdated(state) {
        var detail = Object.assign({}, state || {});
        try {
            document.dispatchEvent(
                new CustomEvent('tm:consent-updated', {
                    detail: detail,
                })
            );
        } catch (e) {}
        try {
            window.dispatchEvent(
                new CustomEvent('tm:consent-updated', {
                    detail: detail,
                })
            );
        } catch (e) {}
    }

    window.TMConsent = {
        /**
         * @param {Record<string, string>} settings Consent Mode fields, e.g. { analytics_storage: 'granted' }
         */
        update: function (settings) {
            var update = settings || {};
            var current = window.__TM_CONSENT_STATE__ && typeof window.__TM_CONSENT_STATE__ === 'object'
                ? window.__TM_CONSENT_STATE__
                : {};
            window.__TM_CONSENT_STATE__ = Object.assign({}, current, update);
            if (typeof window.gtag === 'function') {
                window.gtag('consent', 'update', update);
            }
            emitConsentUpdated(window.__TM_CONSENT_STATE__);
            return window.__TM_CONSENT_STATE__;
        },
    };
})();
