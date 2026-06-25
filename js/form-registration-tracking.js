/**
 * Newsletter registrations -> GTM CompleteRegistration.
 * Sends hashed user data only; raw form fields stay out of dataLayer.
 */
(function () {
    'use strict';

    var EVENT_NAME = 'COMPLETE_REGISTRATION';
    var SUCCESS_PATH = '/contact-thank-you';
    var EMAIL_FIELD_NAMES = ['email'];
    var FIRST_FIELD_NAMES = ['given_name', 'first_name', 'firstname', 'name'];
    var LAST_FIELD_NAMES = ['family_name', 'last_name', 'lastname'];

    function clean(value, maxLength) {
        return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength || 200);
    }

    function lower(value) {
        return clean(value, 320).toLowerCase();
    }

    function fieldValue(formData, names) {
        for (var i = 0; i < names.length; i += 1) {
            var value = formData.get(names[i]);
            if (typeof value === 'string' && clean(value)) return clean(value, 320);
        }
        return '';
    }

    function consentState() {
        return (window.__TM_CONSENT_STATE__ && typeof window.__TM_CONSENT_STATE__ === 'object')
            ? window.__TM_CONSENT_STATE__
            : {};
    }

    function consentProfile() {
        return (window.__TM_TAGGING_CONFIG__ && window.__TM_TAGGING_CONFIG__.consent_profile) || 'global_strict';
    }

    function granted(value) {
        return String(value || '').toLowerCase() === 'granted';
    }

    function denied(value) {
        return String(value || '').toLowerCase().indexOf('denied') === 0;
    }

    function canSendUserData(formData) {
        if (String(formData.get('marketing_opt_in') || '').toLowerCase() !== 'yes') return false;
        var state = consentState();
        if (consentProfile() === 'us_open') return !denied(state.ad_user_data);
        return granted(state.ad_user_data);
    }

    function hex(buffer) {
        var bytes = Array.prototype.slice.call(new Uint8Array(buffer));
        return bytes.map(function (byte) {
            return byte.toString(16).padStart(2, '0');
        }).join('');
    }

    function sha256(value) {
        if (!value || !window.crypto || !window.crypto.subtle || typeof TextEncoder === 'undefined') {
            return Promise.resolve('');
        }
        return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then(hex);
    }

    function eventId() {
        return window.crypto && typeof window.crypto.randomUUID === 'function'
            ? window.crypto.randomUUID()
            : 'tm-reg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
    }

    function locationSlug(formData) {
        return lower(formData.get('location')).replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    }

    function buildUserData(formData) {
        if (!canSendUserData(formData)) return Promise.resolve({});
        var userData = {};
        return Promise.all([
            sha256(lower(fieldValue(formData, EMAIL_FIELD_NAMES))),
            sha256(lower(fieldValue(formData, FIRST_FIELD_NAMES))),
            sha256(lower(fieldValue(formData, LAST_FIELD_NAMES))),
        ]).then(function (hashes) {
            if (hashes[0]) userData.sha256_email_address = hashes[0];
            if (hashes[1]) userData.sha256_first_name = hashes[1];
            if (hashes[2]) userData.sha256_last_name = hashes[2];
            return userData;
        });
    }

    function pushRegistration(form, formData) {
        return buildUserData(formData).then(function (userData) {
            window.dataLayer = window.dataLayer || [];
            var formName = clean(form.getAttribute('name') || form.getAttribute('data-tm-form') || 'newsletter', 80);
            var location = locationSlug(formData);
            var parameters = {
                FORM_NAME: formName,
                PAGE_PATH: window.location.pathname || '/',
                CONSENT_PROFILE: consentProfile(),
                CONSENT_SNAPSHOT: {
                    ad_storage: String(consentState().ad_storage || ''),
                    analytics_storage: String(consentState().analytics_storage || ''),
                    ad_user_data: String(consentState().ad_user_data || ''),
                    ad_personalization: String(consentState().ad_personalization || ''),
                },
            };
            if (location && location !== 'general') parameters.LOCATION_SLUG = location;

            var payload = {
                event: EVENT_NAME,
                event_name: EVENT_NAME,
                event_id: eventId(),
                timestamp: new Date().toISOString(),
                page_path: window.location.pathname || '/',
                form_name: formName,
                conversion_source: 'site_form',
                ga4_event_name: 'complete_registration',
                standard_event_name: 'CompleteRegistration',
                parameters: parameters,
            };
            if (Object.keys(userData).length) payload.user_data = userData;
            window.dataLayer.push(payload);
        });
    }

    function showError(form, message) {
        form.setAttribute('data-tm-submit-error', clean(message || 'Registration failed. Please try again.', 200));
    }

    function redirectAfterTracking(form) {
        var target = form.getAttribute('data-tm-success-path') || SUCCESS_PATH;
        // ponytail: small GTM flush delay; use server-side CAPI if delivery certainty matters.
        window.setTimeout(function () {
            window.location.assign(target);
        }, 250);
    }

    function submitForm(form) {
        if (form.getAttribute('data-tm-registration-pending') === '1') return Promise.resolve();
        form.setAttribute('data-tm-registration-pending', '1');
        var formData = new FormData(form);
        return fetch(form.getAttribute('action') || '/api/newsletter', {
            body: formData,
            credentials: 'same-origin',
            headers: { accept: 'application/json' },
            method: (form.getAttribute('method') || 'POST').toUpperCase(),
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (body) {
                    if (!response.ok || !body.ok) throw new Error(body.error || 'Registration failed.');
                    return pushRegistration(form, formData);
                });
            })
            .then(function () {
                redirectAfterTracking(form);
            })
            .catch(function (error) {
                form.removeAttribute('data-tm-registration-pending');
                showError(form, error && error.message);
            });
    }

    function bind(form) {
        if (!form || form.getAttribute('data-tm-form') !== 'newsletter') return;
        if (form.getAttribute('data-tm-registration-tracking') === '1') return;
        if (!window.fetch || !window.FormData) return;
        form.setAttribute('data-tm-registration-tracking', '1');
        form.addEventListener('submit', function (event) {
            if (form.checkValidity && !form.checkValidity()) return;
            event.preventDefault();
            return submitForm(form);
        });
    }

    function init() {
        document.querySelectorAll('form[data-tm-form="newsletter"]').forEach(bind);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
