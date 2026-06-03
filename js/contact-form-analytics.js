/**
 * Netlify contact form — lifecycle only, no field values (FORM-03/04).
 */
(function () {
    'use strict';

    var CONTACT_CONTEXT_KEY = 'tm_contact_context';

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

    function routingKey(value) {
        return normalizeToken(value).replace(/-/g, '');
    }

    function locationRecords() {
        if (window.TM && Array.isArray(window.TM.locations) && window.TM.locations.length) {
            return window.TM.locations;
        }
        if (window.TM_DATA && Array.isArray(window.TM_DATA.locations) && window.TM_DATA.locations.length) {
            return window.TM_DATA.locations;
        }
        return [];
    }

    function findLocation(slug) {
        var needle = routingKey(slug);
        if (!needle) return null;
        var records = locationRecords();
        for (var i = 0; i < records.length; i += 1) {
            var loc = records[i] || {};
            var candidates = [loc.id, loc.slug, loc.shortName, loc.name];
            for (var j = 0; j < candidates.length; j += 1) {
                if (routingKey(candidates[j]) === needle) return loc;
            }
        }
        return null;
    }

    function selectedValue(form, name) {
        var field = form && form.querySelector ? form.querySelector('[name="' + name + '"]') : null;
        return field ? normalizeToken(field.value) : '';
    }

    function contactPayload(form) {
        var payload = { form_name: 'contact' };
        var locationSlug = selectedValue(form, 'location');
        var subject = selectedValue(form, 'subject');
        if (locationSlug && locationSlug !== 'general') {
            var loc = findLocation(locationSlug);
            payload.location_slug = normalizeToken((loc && (loc.slug || loc.id)) || locationSlug);
            if (loc && loc.region) payload.region = cleanText(loc.region, 80);
            if (loc && (loc.shortName || loc.name)) payload.location_name = cleanText(loc.shortName || loc.name, 120);
        }
        if (subject) payload.form_subject = subject;
        return payload;
    }

    function storeContactContext(payload) {
        if (!payload || !payload.location_slug) return;
        try {
            sessionStorage.setItem(CONTACT_CONTEXT_KEY, JSON.stringify({
                location_slug: payload.location_slug,
                location_name: payload.location_name || '',
                region: payload.region || '',
                form_subject: payload.form_subject || '',
            }));
        } catch (e) {}
    }

    function readContactContext() {
        try {
            var parsed = JSON.parse(sessionStorage.getItem(CONTACT_CONTEXT_KEY) || '{}');
            if (!parsed || typeof parsed !== 'object') return {};
            var payload = {};
            var locationSlug = normalizeToken(parsed.location_slug);
            var subject = normalizeToken(parsed.form_subject);
            if (locationSlug && locationSlug !== 'general') payload.location_slug = locationSlug;
            if (parsed.region) payload.region = cleanText(parsed.region, 80);
            if (parsed.location_name) payload.location_name = cleanText(parsed.location_name, 120);
            if (subject) payload.form_subject = subject;
            return payload;
        } catch (e) {
            return {};
        }
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
                track('contact_form_focus', contactPayload(form));
            },
            true
        );

        form.addEventListener('submit', function () {
            var payload = contactPayload(form);
            storeContactContext(payload);
            track('contact_form_submit_attempt', payload);
        });
    }

    function thankYouOnce() {
        if (!onThankYouPage()) return;
        try {
            if (sessionStorage.getItem('tm_contact_ty_event') === '1') return;
            sessionStorage.setItem('tm_contact_ty_event', '1');
        } catch (e) {}
        track('contact_form_submit_success', Object.assign({ form_name: 'contact' }, readContactContext()));
    }

    function init() {
        if (onContactPage()) bindForm();
        thankYouOnce();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
