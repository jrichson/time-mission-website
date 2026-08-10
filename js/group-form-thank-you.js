/**
 * Group form thank-you pages — lifecycle only, no visitor field values (ANLY-02/03/04).
 */
(function () {
    'use strict';

    function track(key, payload) {
        if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
            window.TMAnalytics.track(key, payload);
        }
    }

    function translate(key, fallback, replacements) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback, replacements);
        }
        var value = fallback;
        Object.keys(replacements || {}).forEach(function (token) {
            value = String(value || '').replace(new RegExp('\\{' + token + '\\}', 'g'), replacements[token]);
        });
        return value;
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

    function jotformQueryContext() {
        var params;
        try {
            params = new URLSearchParams((window.location && window.location.search) || '');
        } catch (e) {
            return null;
        }
        var requestedLocation = normalizeToken(params.get('location'));
        if (requestedLocation === 'mt-prospect') requestedLocation = 'mount-prospect';
        var source = String(params.get('source') || '');
        var pathname = '';
        try {
            pathname = new URL(source, window.location.origin || 'https://www.timemission.com').pathname;
        } catch (e) {
            pathname = '';
        }
        var match = pathname.match(/^\/groups\/inquire\/(manassas|mount-prospect|orland-park|houston|philadelphia)\/(default|birthdays|corporate|field-trips|bachelor-ette|private-events|holidays)\/?$/);
        if (!match) return null;
        var locationSlug = normalizeToken(match[1]);
        if (requestedLocation && requestedLocation !== locationSlug) return null;

        var locationNames = {
            manassas: 'Manassas',
            'mount-prospect': 'Mount Prospect',
            'orland-park': 'Orland Park',
            houston: 'Houston',
            philadelphia: 'Philadelphia',
        };
        return {
            locationSlug: locationSlug,
            locationName: locationNames[locationSlug] || '',
            region: 'us',
            formSubject: normalizeToken(match[2]),
            provider: 'jotform',
            formName: 'jotform_group',
        };
    }

    function contextFromCarrier(el) {
        var dataset = (el && el.dataset) || {};
        if (dataset.contextSource === 'query') return jotformQueryContext();
        return {
            locationSlug: dataset.locationSlug,
            locationName: dataset.locationName,
            region: dataset.region,
            formSubject: dataset.formSubject,
            provider: dataset.provider || 'pipedrive',
            formName: dataset.formName || 'pipedrive_group',
        };
    }

    function updateJotformThankYouCopy(context) {
        if (!context || context.provider !== 'jotform') return;
        var labels = {
            default: { key: 'groupThankYou.event.default', fallback: 'group event' },
            birthdays: { key: 'groupThankYou.event.birthdays', fallback: 'birthday party' },
            corporate: { key: 'groupThankYou.event.corporate', fallback: 'corporate event' },
            'field-trips': { key: 'groupThankYou.event.fieldTrips', fallback: 'field trip' },
            'bachelor-ette': { key: 'groupThankYou.event.bachelorEtte', fallback: 'bachelor or bachelorette event' },
            'private-events': { key: 'groupThankYou.event.privateEvents', fallback: 'private event' },
            holidays: { key: 'groupThankYou.event.holidays', fallback: 'holiday party' },
        };
        var labelConfig = labels[context.formSubject] || labels.default;
        var label = translate(labelConfig.key, labelConfig.fallback);
        var eyebrow = document.querySelector('[data-group-thank-you-eyebrow]');
        var copy = document.querySelector('[data-group-thank-you-copy]');
        var locationLink = document.querySelector('[data-group-thank-you-location-link]');
        if (eyebrow) eyebrow.textContent = context.locationName + ' / ' + label;
        if (copy) copy.textContent = translate(
            'groupThankYou.copy',
            'Thanks. The Time Mission team received your {event} request for {location} and will follow up with next steps.',
            { event: label, location: context.locationName }
        );
        if (locationLink) {
            locationLink.href = '/' + context.locationSlug;
            locationLink.textContent = translate(
                'groupThankYou.viewLocation',
                'View {location}',
                { location: context.locationName }
            );
        }
    }

    function payloadFromCarrier(el) {
        var context = contextFromCarrier(el);
        if (!context) return null;
        var locationSlug = normalizeToken(context.locationSlug);
        var formSubject = normalizeToken(context.formSubject);
        if (!locationSlug || !formSubject) return null;

        var payload = {
            provider: normalizeToken(context.provider),
            form_name: cleanText(context.formName, 80),
            form_subject: formSubject,
            location_slug: locationSlug,
        };
        if (context.locationName) payload.location_name = cleanText(context.locationName, 120);
        if (context.region) payload.region = cleanText(context.region, 80);
        updateJotformThankYouCopy(context);
        return payload;
    }

    function trackOnce() {
        var payload = payloadFromCarrier(carrierElement());
        if (!payload) return;
        var key = 'tm_group_form_ty_event:' + payload.provider + ':' + payload.location_slug + ':' + payload.form_subject;
        try {
            if (sessionStorage.getItem(key) === '1') return;
            sessionStorage.setItem(key, '1');
        } catch (e) {}
        track('group_form_submit_success', payload);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', trackOnce);
    else trackOnce();
    document.addEventListener('tm:language-changed', trackOnce);
    if (window.TMI18n && window.TMI18n.ready && typeof window.TMI18n.ready.then === 'function') {
        window.TMI18n.ready.then(trackOnce);
    }
})();
