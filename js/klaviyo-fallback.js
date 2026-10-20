/**
 * Loads Klaviyo embed forms and shows a first-party backup when Klaviyo can't render.
 *
 * KlaviyoEmbedForm's inline loader starts Klaviyo's onsite script early and records the
 * outcome on window.__tmKlaviyo; this script reacts to it:
 * - script blocked or failing (ad blockers, privacy browsers): backup immediately
 * - script never answers: backup after NO_RESPONSE_MS
 * - script loaded but form still rendering (slow phones and in-app browsers): keep the
 *   loading state until the form appears, with the backup as a last resort after SLOW_RENDER_MS
 * While waiting, a loading message replaces the blank space. The backup posts to
 * /api/klaviyo-signup with which of these happened and how long the visitor waited, and the
 * handler subscribes them to the same list. It then fires tm:klaviyo-backup-submit so the
 * signup is tracked like a Klaviyo form submit.
 */
(function () {
    'use strict';

    var NO_RESPONSE_MS = 4000;
    // Klaviyo's own form bundle can take 7-10s to arrive on slow phones once its loader runs.
    var SLOW_RENDER_MS = 15000;
    var POLL_MS = 200;
    var KLAVIYO_SRC = 'https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=';
    var TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

    // 'loading' until Klaviyo's script loads or fails; shared by every embed on the page.
    var klaviyoScriptState = 'loading';
    var scriptListeners = [];

    function setScriptState(state) {
        klaviyoScriptState = state;
        scriptListeners.splice(0).forEach(function (listener) { listener(state); });
    }

    function trackKlaviyo(companyId) {
        var record = window.__tmKlaviyo;
        if (record) {
            if (record.state !== 'loading') setScriptState(record.state);
            else document.addEventListener('tm:klaviyo-script', function (event) { setScriptState(event.detail); }, { once: true });
            return;
        }
        // Inline loader missing (e.g. markup rendered without it): load Klaviyo here instead.
        if (!/^[A-Za-z0-9]+$/.test(companyId)) {
            setScriptState('failed');
            return;
        }
        var src = KLAVIYO_SRC + companyId;
        var script = document.querySelector('script[src="' + src + '"]');
        if (script) {
            // Already on the page from another component; Klaviyo sets window.klaviyo when it runs.
            if (window.klaviyo && typeof window.klaviyo.push === 'function') setScriptState('loaded');
            script.addEventListener('load', function () { setScriptState('loaded'); });
            script.addEventListener('error', function () { setScriptState('failed'); });
            return;
        }
        script = document.createElement('script');
        script.async = true;
        script.src = src;
        script.addEventListener('load', function () { setScriptState('loaded'); });
        script.addEventListener('error', function () { setScriptState('failed'); });
        (document.head || document.documentElement).appendChild(script);
    }

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
                    // form-registration-tracking.js turns this into the same CompleteRegistration as Klaviyo's form.
                    window.dispatchEvent(new CustomEvent('tm:klaviyo-backup-submit', {
                        detail: { formId: root.getAttribute('data-tm-klaviyo-embed') || '' },
                    }));
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
        var loading = root.querySelector('[data-tm-klaviyo-loading]');
        if (!embed || !form) return;

        // Wall-clock time: interval ticks slow down in background tabs.
        var started = Date.now();
        var touched = false;
        form.addEventListener('input', function () { touched = true; }, { once: true });
        bindSubmit(root, form);
        if (loading) loading.hidden = false;

        function finishLoading() {
            if (loading) loading.hidden = true;
        }

        function setField(name, value) {
            var input = form.querySelector('input[name="' + name + '"]');
            if (input) input.value = value;
        }

        // reason: 'blocked', 'no_response' or 'slow_render'.
        function showBackup(reason) {
            if (klaviyoRendered(embed) || !form.hidden) return;
            finishLoading();
            setField('backup_reason', reason);
            setField('backup_wait_ms', String(Date.now() - started));
            form.hidden = false;
            root.setAttribute('data-tm-klaviyo-backup-shown', '1');
            mountTurnstile(form);
        }

        function onKlaviyoRendered() {
            finishLoading();
            if (form.hidden) return;
            // Klaviyo arrived after the backup: keep whichever form the visitor is using.
            if (touched) embed.hidden = true;
            else form.hidden = true;
        }

        if (typeof MutationObserver === 'function') {
            new MutationObserver(function () {
                if (klaviyoRendered(embed)) onKlaviyoRendered();
            }).observe(embed, { childList: true });
        }

        function onScriptState(state) {
            if (state === 'failed') showBackup('blocked');
        }
        if (klaviyoScriptState === 'loading') scriptListeners.push(onScriptState);
        else onScriptState(klaviyoScriptState);

        var timer = window.setInterval(function () {
            var waited = Date.now() - started;
            if (klaviyoRendered(embed)) {
                window.clearInterval(timer);
                onKlaviyoRendered();
            } else if (klaviyoScriptState === 'failed') {
                window.clearInterval(timer);
                showBackup('blocked');
            } else if (klaviyoScriptState === 'loading' && waited >= NO_RESPONSE_MS) {
                window.clearInterval(timer);
                showBackup('no_response');
            } else if (waited >= SLOW_RENDER_MS) {
                window.clearInterval(timer);
                showBackup('slow_render');
            }
        }, POLL_MS);
    }

    function initAll() {
        var roots = document.querySelectorAll('[data-tm-klaviyo-embed]');
        if (!roots.length) return;
        trackKlaviyo(roots[0].getAttribute('data-tm-klaviyo-company') || '');
        roots.forEach(init);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
    else initAll();
})();
