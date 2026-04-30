/**
 * Netlify contact form — lifecycle only, no field values (FORM-03/04).
 */
(function () {
    'use strict';

    function track(key, payload) {
        if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
            window.TMAnalytics.track(key, payload);
        }
    }

    function onContactPage() {
        var p = window.location.pathname || '';
        return p.indexOf('/contact') !== -1;
    }

    function onThankYouPage() {
        var p = window.location.pathname || '';
        return p.indexOf('contact-thank-you') !== -1;
    }

    function bindForm() {
        var form = document.querySelector('form.contact-form');
        if (!form || form.getAttribute('data-tm-contact-analytics') === '1') return;
        form.setAttribute('data-tm-contact-analytics', '1');

        form.addEventListener(
            'focusin',
            function () {
                if (form.getAttribute('data-tm-focused') === '1') return;
                form.setAttribute('data-tm-focused', '1');
                track('contact_form_focus', { form_name: 'contact' });
            },
            true
        );

        form.addEventListener('submit', function () {
            track('contact_form_submit_attempt', { form_name: 'contact' });
        });
    }

    function thankYouOnce() {
        if (!onThankYouPage()) return;
        try {
            if (sessionStorage.getItem('tm_contact_ty_event') === '1') return;
            sessionStorage.setItem('tm_contact_ty_event', '1');
        } catch (e) {}
        track('contact_form_submit_success', { form_name: 'contact' });
    }

    function init() {
        if (onContactPage()) bindForm();
        thankYouOnce();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
