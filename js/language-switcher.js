(function () {
    'use strict';

    var config = window.__TM_I18N__ || {};
    var languages = Array.isArray(config.languages) ? config.languages : [];
    var translations = config.translations || {};
    var defaultLanguage = config.defaultLanguage || (languages[0] && languages[0].code) || 'en';
    var storageKey = config.storageKey || 'tm_language';
    var currentLanguage = defaultLanguage;

    function findLanguage(code) {
        if (!code) return null;
        var normalized = String(code).trim().toLowerCase();
        for (var i = 0; i < languages.length; i += 1) {
            if (languages[i].code.toLowerCase() === normalized) return languages[i];
        }
        var base = normalized.split('-')[0];
        for (var j = 0; j < languages.length; j += 1) {
            if (languages[j].code.toLowerCase().split('-')[0] === base) return languages[j];
        }
        return null;
    }

    function getBrowserLanguage() {
        var preferred = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
        for (var i = 0; i < preferred.length; i += 1) {
            var matched = findLanguage(preferred[i]);
            if (matched) return matched.code;
        }
        return defaultLanguage;
    }

    function readSavedLanguage() {
        try {
            return window.localStorage.getItem(storageKey);
        } catch (e) {
            return null;
        }
    }

    function writeSavedLanguage(code) {
        try {
            window.localStorage.setItem(storageKey, code);
        } catch (e) {
            // Storage can be unavailable in private modes; the active page still updates.
        }
    }

    function getUrlLanguage() {
        try {
            return new URLSearchParams(window.location.search).get('lang');
        } catch (e) {
            return null;
        }
    }

    function getInitialLanguage() {
        var urlLang = findLanguage(getUrlLanguage());
        if (urlLang) return urlLang.code;

        var savedLang = findLanguage(readSavedLanguage());
        if (savedLang) return savedLang.code;

        var pageLang = findLanguage(document.documentElement.lang);
        if (pageLang && pageLang.code !== defaultLanguage) return pageLang.code;

        return getBrowserLanguage();
    }

    function translate(key, langCode) {
        var lang = findLanguage(langCode || currentLanguage);
        var code = lang ? lang.code : defaultLanguage;
        var active = translations[code] || {};
        if (Object.prototype.hasOwnProperty.call(active, key)) return active[key];
        var fallback = translations[defaultLanguage] || {};
        return Object.prototype.hasOwnProperty.call(fallback, key) ? fallback[key] : null;
    }

    function applyTextTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var value = translate(el.getAttribute('data-i18n'));
            if (typeof value === 'string') el.textContent = value;
        });

        ['aria-label', 'alt', 'placeholder', 'title', 'value'].forEach(function (attr) {
            document.querySelectorAll('[data-i18n-' + attr + ']').forEach(function (el) {
                var value = translate(el.getAttribute('data-i18n-' + attr));
                if (typeof value === 'string') el.setAttribute(attr, value);
            });
        });
    }

    function syncControls() {
        document.querySelectorAll('[data-language-select]').forEach(function (select) {
            select.value = currentLanguage;
        });
    }

    function updateStatus() {
        var language = findLanguage(currentLanguage);
        if (!language) return;
        var message = translate('language.changed') || 'Language set to {language}';
        message = message.replace('{language}', language.nativeLabel || language.label || language.code);
        document.querySelectorAll('[data-language-status]').forEach(function (status) {
            status.textContent = message;
        });
    }

    function setLanguage(code, options) {
        var language = findLanguage(code);
        if (!language) language = findLanguage(defaultLanguage);
        if (!language) return;

        currentLanguage = language.code;
        document.documentElement.lang = language.htmlLang || language.code;
        document.documentElement.dataset.tmLanguage = language.code;
        if (!options || options.persist !== false) writeSavedLanguage(language.code);
        syncControls();
        applyTextTranslations();
        updateStatus();
        document.dispatchEvent(new CustomEvent('tm:language-changed', {
            detail: { language: language.code, htmlLang: language.htmlLang || language.code }
        }));
    }

    function init() {
        document.querySelectorAll('[data-language-select]').forEach(function (select) {
            select.addEventListener('change', function () {
                setLanguage(select.value);
            });
        });
        setLanguage(getInitialLanguage(), { persist: false });
    }

    window.TMI18n = {
        t: translate,
        setLanguage: setLanguage,
        getLanguage: function () { return currentLanguage; },
        languages: languages.slice()
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
