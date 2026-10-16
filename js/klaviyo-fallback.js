/**
 * Backup forms for Klaviyo embeds.
 * Klaviyo renders into an empty div. When its script is blocked (ad blockers, privacy
 * browsers) the div stays empty, so after a short wait the first-party backup form is
 * shown instead. It posts to /api/klaviyo-signup, which subscribes to the same list.
 */
(function () {
    'use strict';

    var WAIT_MS = 6000;
    var POLL_MS = 500;
    var TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

    function klaviyoRendered(embed) {
        return Boolean(embed && embed.children.length > 0);
    }

    function loadTurnstile(callback) {
        if (window.turnstile && typeof window.turnstile.render === 'function') {
            callback();
            return;
        }
        if (!document.querySelector('script[data-tm-turnstile-api]')) {
            var script = document.createElement('script');
            script.src = TURNSTILE_SRC;
            script.async = true;
            script.setAttribute('data-tm-turnstile-api', '1');
            document.head.appendChild(script);
        }
        var tries = 0;
        var timer = window.setInterval(function () {
            tries += 1;
            if (window.turnstile && typeof window.turnstile.render === 'function') {
                window.clearInterval(timer);
                callback();
            } else if (tries > 40) {
                window.clearInterval(timer);
            }
        }, 250);
    }

    function mountTurnstile(form) {
        var config = window.__TM_FORM_CONFIG__ || {};
        var siteKey = typeof config.turnstileSiteKey === 'string' ? config.turnstileSiteKey.trim() : '';
        var container = form.querySelector('[data-tm-klaviyo-turnstile]');
        if (!siteKey || !container || container.getAttribute('data-tm-turnstile-ready') === '1') return;
        container.setAttribute('data-tm-turnstile-ready', '1');
        loadTurnstile(function () {
            var widgetId = window.turnstile.render(container, {
                sitekey: siteKey,
                theme: 'dark',
                'response-field-name': 'cf-turnstile-response',
            });
            form.setAttribute('data-tm-turnstile-widget', String(widgetId));
        });
    }

    function resetTurnstile(form) {
        var widgetId = form.getAttribute('data-tm-turnstile-widget');
        if (widgetId && window.turnstile && typeof window.turnstile.reset === 'function') {
            window.turnstile.reset(widgetId);
        }
    }

    function setStatus(form, message) {
        var status = form.querySelector('.tm-klaviyo-backup__status');
        if (status) status.textContent = message || '';
    }

    function bindSubmit(root, form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
            var button = form.querySelector('button[type="submit"]');
            if (button) button.disabled = true;
            setStatus(form, 'Sending…');
            fetch(form.getAttribute('action'), {
                method: 'POST',
                // The form handler rejects multipart bodies, so send it URL-encoded.
                body: new URLSearchParams(new FormData(form)),
                headers: { accept: 'application/json' },
                credentials: 'same-origin',
            })
                .then(function (response) {
                    return response.json().catch(function () { return {}; }).then(function (body) {
                        if (!response.ok || !body.ok) throw new Error(body.error || 'Signup failed. Please try again.');
                    });
                })
                .then(function () {
                    form.hidden = true;
                    var success = root.querySelector('[data-tm-klaviyo-backup-success]');
                    if (success) success.hidden = false;
                })
                .catch(function (error) {
                    setStatus(form, error.message || 'Signup failed. Please try again.');
                    resetTurnstile(form);
                    if (button) button.disabled = false;
                });
        });
    }

    function init(root) {
        if (root.getAttribute('data-tm-klaviyo-ready') === '1') return;
        root.setAttribute('data-tm-klaviyo-ready', '1');
        var embed = root.querySelector('[data-klaviyo-form-embed]');
        var form = root.querySelector('[data-tm-klaviyo-backup]');
        if (!embed || !form) return;

        var touched = false;
        form.addEventListener('input', function () { touched = true; }, { once: true });
        bindSubmit(root, form);

        function showBackup() {
            if (klaviyoRendered(embed) || !form.hidden) return;
            form.hidden = false;
            root.setAttribute('data-tm-klaviyo-backup-shown', '1');
            mountTurnstile(form);
        }

        // If Klaviyo recovers before the visitor starts typing, prefer the Klaviyo form.
        if (typeof MutationObserver === 'function') {
            new MutationObserver(function () {
                if (klaviyoRendered(embed) && !touched) form.hidden = true;
            }).observe(embed, { childList: true });
        }

        var script = document.querySelector('script[src*="static.klaviyo.com/onsite/js/klaviyo.js"]');
        if (script) script.addEventListener('error', showBackup);

        var waited = 0;
        var timer = window.setInterval(function () {
            waited += POLL_MS;
            if (klaviyoRendered(embed)) {
                window.clearInterval(timer);
            } else if (waited >= WAIT_MS) {
                window.clearInterval(timer);
                showBackup();
            }
        }, POLL_MS);
    }

    function initAll() {
        document.querySelectorAll('[data-tm-klaviyo-embed]').forEach(init);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
    else initAll();
})();
