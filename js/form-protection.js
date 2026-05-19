/**
 * Cloudflare Turnstile binding for production forms.
 * Forms remain plain POST forms; this only mounts the widget when a public site key exists.
 */
(function () {
    'use strict';

    var config = window.__TM_FORM_CONFIG__ || {};
    var siteKey = typeof config.turnstileSiteKey === 'string' ? config.turnstileSiteKey.trim() : '';
    if (!siteKey) return;

    function loadTurnstile() {
        if (document.querySelector('script[data-tm-turnstile-api]')) return;
        var script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.setAttribute('data-tm-turnstile-api', '1');
        document.head.appendChild(script);
    }

    function normalizeLocation(value) {
        return String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
    }

    function currentLocationSlug() {
        if (window.TM) {
            var current = window.TM.current || null;
            var currentSlug = current && (current.slug || current.id);
            if (currentSlug) return normalizeLocation(currentSlug);
            if (typeof window.TM.getSavedSlug === 'function') {
                var saved = window.TM.getSavedSlug();
                if (saved) return normalizeLocation(saved);
            }
        }
        return 'general';
    }

    function ensureNewsletterLocation(form) {
        if (!form || form.getAttribute('data-tm-form') !== 'newsletter') return;
        var input = form.querySelector('input[name="location"]');
        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'location';
            form.insertBefore(input, form.firstElementChild || null);
        }
        input.value = currentLocationSlug();
    }

    function prepareWidget(container) {
        if (!container || container.getAttribute('data-tm-turnstile-ready') === '1') return;
        container.classList.add('cf-turnstile');
        container.setAttribute('data-sitekey', siteKey);
        container.setAttribute('data-response-field-name', 'cf-turnstile-response');
        container.setAttribute('data-theme', 'dark');
        container.setAttribute('data-tm-turnstile-ready', '1');

        if (window.turnstile && typeof window.turnstile.render === 'function') {
            window.turnstile.render(container, {
                sitekey: siteKey,
                theme: 'dark',
                'response-field-name': 'cf-turnstile-response',
            });
        }
    }

    function init() {
        var containers = document.querySelectorAll('[data-tm-turnstile]');
        document.querySelectorAll('form[data-tm-form="newsletter"]').forEach(function (form) {
            ensureNewsletterLocation(form);
            form.addEventListener('submit', function () {
                ensureNewsletterLocation(form);
            });
        });
        document.addEventListener('tm:location-changed', function () {
            document.querySelectorAll('form[data-tm-form="newsletter"]').forEach(ensureNewsletterLocation);
        });
        if (containers.length) {
            containers.forEach(prepareWidget);
            loadTurnstile();
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
