/**
 * Phase 10 P2-4 — EU-routed cookie consent banner
 * Wraps vanilla-cookieconsent@3 and integrates with Phase 6 Consent Mode v2.
 * Locked decision D-03: banner ONLY appears when consent_profile !== 'us_open'.
 * Locked decision D-05: button label is 'Manage Preferences' (renamed per UI-SPEC).
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;

    function getProfile() {
        try {
            return (window.__TM_TAGGING_CONFIG__ || {}).consent_profile || 'global_strict';
        } catch (e) {
            return 'global_strict';
        }
    }

    // EU/strict pages get the banner; US-default pages skip it (D-03 locked)
    if (getProfile() === 'us_open') return;

    if (!window.CookieConsent || typeof window.CookieConsent.run !== 'function') return;

    function dispatchConsentUpdated() {
        try {
            window.dispatchEvent(new CustomEvent('tm:consent-updated'));
        } catch (e) { /* IE fallback not required — supported browsers only */ }
    }

    function gtagConsent(update) {
        try {
            if (typeof window.gtag === 'function') {
                window.gtag('consent', 'update', update);
            } else {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(['consent', 'update', update]);
            }
        } catch (e) { /* fail soft */ }
    }

    function applyConsent(cookie) {
        var cats = (cookie && cookie.categories) || [];
        var update = {
            analytics_storage: cats.indexOf('analytics') !== -1 ? 'granted' : 'denied',
            ad_storage: cats.indexOf('marketing') !== -1 ? 'granted' : 'denied',
            ad_user_data: cats.indexOf('marketing') !== -1 ? 'granted' : 'denied',
            ad_personalization: cats.indexOf('marketing') !== -1 ? 'granted' : 'denied',
        };
        gtagConsent(update);
        try {
            window.__TM_CONSENT_STATE__ = Object.assign(window.__TM_CONSENT_STATE__ || {}, update);
        } catch (e) { /* fail soft */ }
        dispatchConsentUpdated();
    }

    window.CookieConsent.run({
        cookie: { name: 'tm_consent_v1' },
        guiOptions: {
            consentModal: { layout: 'box', position: 'bottom center' },
            preferencesModal: { layout: 'box' },
        },
        categories: {
            necessary: { enabled: true, readOnly: true },
            analytics: {},
            marketing: {},
        },
        language: {
            default: 'en',
            translations: {
                en: {
                    consentModal: {
                        title: 'We use cookies',
                        description: 'We use cookies to improve your experience and measure site performance. You can accept all cookies, reject non-essential cookies, or manage your preferences.',
                        acceptAllBtn: 'Accept all',
                        acceptNecessaryBtn: 'Reject all',
                        showPreferencesBtn: 'Manage Preferences',
                    },
                    preferencesModal: {
                        title: 'Cookie Preferences',
                        acceptAllBtn: 'Accept all',
                        acceptNecessaryBtn: 'Reject all',
                        savePreferencesBtn: 'Save preferences',
                        closeIconLabel: 'Close',
                        sections: [
                            { title: 'Necessary', description: 'Required for the site to function. Cannot be disabled.', linkedCategory: 'necessary' },
                            { title: 'Analytics', description: 'Help us understand how visitors use the site. Off by default.', linkedCategory: 'analytics' },
                            { title: 'Marketing', description: 'Used to deliver relevant ads. Off by default.', linkedCategory: 'marketing' },
                        ],
                    },
                },
            },
        },
        onFirstConsent: function (params) { applyConsent(params.cookie); },
        onConsent: function (params) { applyConsent(params.cookie); },
        onChange: function (params) { applyConsent(params.cookie); },
    });
})();
