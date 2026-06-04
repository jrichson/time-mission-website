/**
 * Pipedrive group form thank-you pages — lifecycle only, no field values (ANLY-02/03/04).
 */
(function () {
    'use strict';

    function track(key, payload) {
        if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
            window.TMAnalytics.track(key, payload);
        }
    }

    function normalizeToken(value) {
        return String(value || '')
            .toLowerCase()
            .trim()
            .replace(/&/g, 'and')
            .replace(/[\s_]+/g, '-')
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function cleanText(value, maxLength) {
        return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength || 120);
    }

    function carrierElement() {
        return document.querySelector('[data-tm-group-form-thank-you]');
    }

    function payloadFromCarrier(el) {
        var dataset = (el && el.dataset) || {};
        var locationSlug = normalizeToken(dataset.locationSlug);
        var formSubject = normalizeToken(dataset.formSubject);
        if (!locationSlug || !formSubject) return null;

        var payload = {
            provider: 'pipedrive',
            form_name: 'pipedrive_group',
            form_subject: formSubject,
            location_slug: locationSlug,
        };
        if (dataset.locationName) payload.location_name = cleanText(dataset.locationName, 120);
        if (dataset.region) payload.region = cleanText(dataset.region, 80);
        return payload;
    }

    function trackOnce() {
        var payload = payloadFromCarrier(carrierElement());
        if (!payload) return;
        var key = 'tm_group_form_ty_event:' + payload.location_slug + ':' + payload.form_subject;
        try {
            if (sessionStorage.getItem(key) === '1') return;
            sessionStorage.setItem(key, '1');
        } catch (e) {}
        track('group_form_submit_success', payload);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', trackOnce);
    else trackOnce();
})();
