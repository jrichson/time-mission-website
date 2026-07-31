/**
 * EU-routed cookie consent banner.
 * Wraps vanilla-cookieconsent@3 and integrates with Consent Mode v2.
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

    // EU/strict pages get the banner; US-default pages skip it.
    if (getProfile() === 'us_open') return;

    if (!window.CookieConsent || typeof window.CookieConsent.run !== 'function') return;
    var documentLanguage = String(
        (document.documentElement && document.documentElement.lang) || 'en'
    ).toLowerCase().split('-')[0];
    var consentLanguage = ['en', 'nl', 'fr', 'es'].indexOf(documentLanguage) !== -1
        ? documentLanguage
        : 'en';

    function applyConsentUpdate(update) {
        if (window.TMConsent && typeof window.TMConsent.update === 'function') {
            window.TMConsent.update(update);
            return;
        }
        try {
            window.__TM_CONSENT_STATE__ = Object.assign(window.__TM_CONSENT_STATE__ || {}, update);
            window.dispatchEvent(new CustomEvent('tm:consent-updated', {
                detail: Object.assign({}, window.__TM_CONSENT_STATE__),
            }));
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
        applyConsentUpdate(update);
    }

    function translation(key, language) {
        if (!window.TMI18n || typeof window.TMI18n.t !== 'function') return '';
        return window.TMI18n.t(key, language) || '';
    }

    function consentCopy(language) {
        return {
            consentModal: {
                title: translation('consent.title', language),
                description: translation('consent.description', language),
                acceptAllBtn: translation('consent.acceptAll', language),
                acceptNecessaryBtn: translation('consent.rejectAll', language),
                showPreferencesBtn: translation('consent.manage', language),
            },
            preferencesModal: {
                title: translation('consent.preferencesTitle', language),
                acceptAllBtn: translation('consent.acceptAll', language),
                acceptNecessaryBtn: translation('consent.rejectAll', language),
                savePreferencesBtn: translation('consent.save', language),
                closeIconLabel: translation('consent.close', language),
                sections: [
                    {
                        title: translation('consent.necessaryTitle', language),
                        description: translation('consent.necessaryDescription', language),
                        linkedCategory: 'necessary',
                    },
                    {
                        title: translation('consent.analyticsTitle', language),
                        description: translation('consent.analyticsDescription', language),
                        linkedCategory: 'analytics',
                    },
                    {
                        title: translation('consent.marketingTitle', language),
                        description: translation('consent.marketingDescription', language),
                        linkedCategory: 'marketing',
                    },
                ],
            },
        };
    }

    function runConsent() {
      var translations = {};
      ['en', 'nl', 'fr', 'es'].forEach(function (language) {
          translations[language] = consentCopy(language);
      });

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
            default: consentLanguage,
            translations: translations,
        },
        onFirstConsent: function (params) { applyConsent(params.cookie); },
        onConsent: function (params) { applyConsent(params.cookie); },
        onChange: function (params) { applyConsent(params.cookie); },
      });
    }

    if (window.TMI18n && window.TMI18n.ready && typeof window.TMI18n.ready.then === 'function') {
        window.TMI18n.ready.then(runConsent);
    } else {
        runConsent();
    }
})();
