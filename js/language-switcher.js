(function () {
    'use strict';

    var config = window.__TM_I18N__ || {};
    var siteProfile = window.__TM_SITE_PROFILE__ || {};
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
        window.__TM_I18N__ = nextConfig;
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
            if (window.__TM_DEBUG__) window.__TM_LAST_I18N_ERROR__ = e;
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

    function localeFromPath() {
        if (!siteProfile.localizedRoutes) return defaultLanguage;
        var first = String(window.location.pathname || '/').split('/')[1] || '';
        var language = findLanguage(first);
        return language && language.code !== defaultLanguage ? language.code : defaultLanguage;
    }

    function localizedUrl(code) {
        var target = findLanguage(code);
        var targetCode = target ? target.code : defaultLanguage;
        var url = new URL(window.location.href);
        var parts = url.pathname.split('/').filter(Boolean);
        var first = findLanguage(parts[0]);
        if (first && first.code !== defaultLanguage) parts.shift();
        if (targetCode !== defaultLanguage) parts.unshift(targetCode);
        url.pathname = '/' + parts.join('/');
        if (url.pathname !== '/' && /\/$/.test(window.location.pathname)) url.pathname += '/';
        return url.toString();
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
        if (siteProfile.localizedRoutes) return localeFromPath();

        var urlLang = findLanguage(getUrlLanguage());
        if (urlLang) return urlLang.code;

        var savedLang = findLanguage(readSavedLanguage());
        if (savedLang) return savedLang.code;

        var pageLang = findLanguage(document.documentElement.lang);
        if (pageLang && pageLang.code !== defaultLanguage) return pageLang.code;

        return getBrowserLanguage();
    }

    function suggestedLanguage() {
        var saved = findLanguage(readSavedLanguage());
        if (saved && saved.code !== currentLanguage) return saved.code;

        var browser = findLanguage(getBrowserLanguage());
        if (browser && browser.code !== currentLanguage) return browser.code;

        var locationFallback = {
            antwerp: 'nl',
            brussels: 'fr',
            eindhoven: 'nl'
        };
        var locationCode = document.body && locationFallback[document.body.dataset.location];
        var locationLanguage = findLanguage(locationCode);
        return locationLanguage && locationLanguage.code !== currentLanguage
            ? locationLanguage.code
            : '';
    }

    function setupLanguageSuggestion() {
        if (!siteProfile.localizedRoutes || currentLanguage !== defaultLanguage) return;
        var suggestion = document.querySelector('[data-language-suggestion]');
        if (!suggestion) return;
        try {
            if (window.sessionStorage.getItem('tm_language_suggestion_dismissed') === '1') return;
        } catch (e) {
            // A suggestion can still be shown when session storage is unavailable.
        }

        var code = suggestedLanguage();
        var view = languageView(findLanguage(code));
        if (!view) return;

        var copy = suggestion.querySelector('[data-language-suggestion-copy]');
        var link = suggestion.querySelector('[data-language-suggestion-link]');
        var dismiss = suggestion.querySelector('[data-language-suggestion-dismiss]');
        if (!copy || !link || !dismiss) return;

        copy.textContent = text('language.suggestion', 'Prefer {language}?', {
            language: view.nativeLabel
        });
        link.textContent = translateText('language.switch', 'View site');
        link.href = localizedUrl(code);
        link.addEventListener('click', function () {
            writeSavedLanguage(code);
        });
        dismiss.setAttribute(
            'aria-label',
            translateText('language.dismiss', 'Dismiss language suggestion')
        );
        dismiss.addEventListener('click', function () {
            suggestion.hidden = true;
            try {
                window.sessionStorage.setItem('tm_language_suggestion_dismissed', '1');
            } catch (e) {
                // Dismissal remains effective for the current page.
            }
        });
        suggestion.hidden = false;
    }

    function translate(key, langCode) {
        var lang = findLanguage(langCode || currentLanguage);
        var code = lang ? lang.code : defaultLanguage;
        var active = translations[code] || {};
        if (Object.prototype.hasOwnProperty.call(active, key)) return active[key];
        var fallback = translations[defaultLanguage] || {};
        return Object.prototype.hasOwnProperty.call(fallback, key) ? fallback[key] : null;
    }

    function translateText(key, fallback, langCode) {
        var value = translate(key, langCode);
        return typeof value === 'string' ? value : fallback;
    }

    function formatText(value, replacements) {
        var output = String(value || '');
        Object.keys(replacements || {}).forEach(function (key) {
            output = output.replace(new RegExp('\\{' + key + '\\}', 'g'), replacements[key]);
        });
        return output;
    }

    function text(key, fallback, replacements, langCode) {
        return formatText(translateText(key, fallback, langCode), replacements);
    }

    function sanitizeTranslatedHtml(value) {
        var template = document.createElement('template');
        template.innerHTML = String(value || '');
        var allowedTags = { STRONG: true, SPAN: true };
        var allowedSpanClasses = { 'copy-emphasis': true };

        Array.prototype.slice.call(template.content.querySelectorAll('*')).forEach(function (node) {
            if (!allowedTags[node.tagName]) {
                node.replaceWith(document.createTextNode(node.textContent || ''));
                return;
            }
            Array.prototype.slice.call(node.attributes).forEach(function (attr) {
                var keepClass = node.tagName === 'SPAN'
                    && attr.name === 'class'
                    && allowedSpanClasses[attr.value];
                if (!keepClass) node.removeAttribute(attr.name);
            });
        });

        return template.innerHTML;
    }

    function array(key, fallback, langCode) {
        var value = translate(key, langCode);
        return Array.isArray(value) && value.length ? value : (Array.isArray(fallback) ? fallback : []);
    }

    function applyTextTranslations() {
        document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            var value = translate(el.getAttribute('data-i18n-html'));
            if (typeof value === 'string') el.innerHTML = sanitizeTranslatedHtml(value);
        });

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

        var renderedHtmlLang = typeof document.documentElement.getAttribute === 'function'
            ? (document.documentElement.getAttribute('lang') || '')
            : (document.documentElement.lang || '');
        var htmlLang = siteProfile.localizedRoutes
            && languageBase(renderedHtmlLang) === languageBase(language.code)
            ? renderedHtmlLang
            : (language.htmlLang || language.code);
        currentLanguage = language.code;
        document.documentElement.lang = htmlLang;
        document.documentElement.dataset.tmLanguage = language.code;
        if (!options || options.persist !== false) writeSavedLanguage(language.code);
        syncControls();
        applyTextTranslations();
        updateStatus();
        document.dispatchEvent(new CustomEvent('tm:language-changed', {
            detail: { language: language.code, htmlLang: htmlLang }
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
                if (siteProfile.localizedRoutes) {
                    writeSavedLanguage(select.value);
                    window.location.assign(localizedUrl(select.value));
                    return;
                }
                setLanguage(select.value);
            }
            select.addEventListener('change', handleLanguageSelection);
            select.addEventListener('input', handleLanguageSelection);
        });
        setLanguage(getInitialLanguage(), { persist: false });
        setupLanguageSuggestion();
        readyResolve();
    }

    window.TMI18n = {
        t: translate,
        text: text,
        array: array,
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
