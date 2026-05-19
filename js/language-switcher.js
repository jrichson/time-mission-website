(function () {
    'use strict';

    var config = window.__TM_I18N__ || {};
    var languages = Array.isArray(config.languages) ? config.languages : [];
    var translations = config.translations || {};
    var defaultLanguage = config.defaultLanguage || (languages[0] && languages[0].code) || 'en';
    var storageKey = config.storageKey || 'tm_language';
    var currentLanguage = defaultLanguage;
    var readyResolve = function () {};
    var readyPromise = new Promise(function (resolve) {
        readyResolve = resolve;
    });

    function normalizeLanguageCode(code) {
        return String(code || '').trim().toLowerCase();
    }

    function languageBase(code) {
        return normalizeLanguageCode(code).split('-')[0];
    }

    function languageView(language) {
        if (!language) return null;
        var label = translate('language.label', language.code);
        return {
            code: language.code,
            htmlLang: language.htmlLang || language.code,
            label: typeof label === 'string' ? label : (language.label || language.code),
            nativeLabel: language.nativeLabel || language.label || language.code,
            shortLabel: language.shortLabel || String(language.code).toUpperCase()
        };
    }

    function applyConfig(nextConfig) {
        if (!nextConfig || typeof nextConfig !== 'object') return;
        config = nextConfig;
        languages = Array.isArray(config.languages) ? config.languages : [];
        translations = config.translations || {};
        defaultLanguage = config.defaultLanguage || (languages[0] && languages[0].code) || 'en';
        storageKey = config.storageKey || 'tm_language';
        currentLanguage = defaultLanguage;
        if (window.TMI18n) window.TMI18n.languages = languages.slice();
    }

    async function loadConfig() {
        if (config && Array.isArray(config.languages) && config.languages.length) return;
        if (typeof fetch !== 'function') return;
        var url = window.__TM_I18N_URL__ || '/data/i18n.json';
        try {
            var response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            applyConfig(await response.json());
        } catch (e) {
            console.warn('TM i18n: failed to load ' + url, e);
        }
    }

    function findLanguage(code) {
        if (!code) return null;
        var normalized = normalizeLanguageCode(code);
        for (var i = 0; i < languages.length; i += 1) {
            if (normalizeLanguageCode(languages[i].code) === normalized) return languages[i];
        }
        var base = languageBase(normalized);
        for (var j = 0; j < languages.length; j += 1) {
            if (languageBase(languages[j].code) === base) return languages[j];
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
        var view = languageView(findLanguage(currentLanguage));
        if (!view) return;
        var message = translate('language.changed') || 'Language set to {language}';
        message = message.replace('{language}', view.nativeLabel || view.label || view.code);
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

    async function boot() {
        await loadConfig();
        document.querySelectorAll('[data-language-switcher]').forEach(function (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault();
            });
        });
        document.querySelectorAll('[data-language-select]').forEach(function (select) {
            function handleLanguageSelection() {
                if (select.value === currentLanguage) return;
                setLanguage(select.value);
            }
            select.addEventListener('change', handleLanguageSelection);
            select.addEventListener('input', handleLanguageSelection);
        });
        setLanguage(getInitialLanguage(), { persist: false });
        readyResolve();
    }

    window.TMI18n = {
        t: translate,
        setLanguage: setLanguage,
        getLanguageView: function (code) { return languageView(findLanguage(code || currentLanguage)); },
        getSupportedLanguages: function () { return languages.map(languageView).filter(Boolean); },
        getLanguage: function () { return currentLanguage; },
        languages: languages.slice(),
        ready: readyPromise
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
