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
        if (!containers.length) return;
        containers.forEach(prepareWidget);
        loadTurnstile();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
