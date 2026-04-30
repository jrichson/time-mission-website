/**
 * GTM / dataLayer — normalized, non-PII events (ANLY-02/03/04).
 * Labels: keep TM_ANALYTICS_LABELS_EMBED identical to src/data/site/analytics-labels.json (check:analytics).
 * Unknown event keys: first use is ignored silently (no console); see unknownEventKeys note below.
 */
(function () {
    'use strict';

    /* synced from src/data/site/analytics-labels.json — npm run check:analytics */
    var TM_ANALYTICS_LABELS_EMBED = {
        eventNames: {
            ad_landing: 'AD_LANDING',
            cta_click: 'CTA_CLICK',
            booking_click: 'BOOKING_CLICK',
            checkout_start: 'CHECKOUT_START',
            phone_click: 'PHONE_CLICK',
            email_click: 'EMAIL_CLICK',
            gift_card_click: 'GIFT_CARD_CLICK',
            location_select: 'LOCATION_SELECT',
            ticket_panel_open: 'TICKET_PANEL_OPEN',
            ticket_panel_close: 'TICKET_PANEL_CLOSE',
            mission_card_click: 'MISSION_CARD_CLICK',
            contact_form_focus: 'CONTACT_FORM_FOCUS',
            contact_form_submit_attempt: 'CONTACT_FORM_SUBMIT_ATTEMPT',
            contact_form_submit_success: 'CONTACT_FORM_SUBMIT_SUCCESS',
            nav_cta_click: 'NAV_CTA_CLICK',
        },
        parameters: {
            page_path: 'PAGE_PATH',
            cta_id: 'CTA_ID',
            location_slug: 'LOCATION_SLUG',
            region: 'REGION',
            destination_url: 'DESTINATION_URL',
            event_id: 'EVENT_ID',
            link_path: 'LINK_PATH',
            nav_section: 'NAV_SECTION',
            mission_title: 'MISSION_TITLE',
            utm_source: 'UTM_SOURCE',
            utm_medium: 'UTM_MEDIUM',
            utm_campaign: 'UTM_CAMPAIGN',
            utm_content: 'UTM_CONTENT',
            utm_term: 'UTM_TERM',
            gclid: 'GCLID',
            wbraid: 'WBRAID',
            gbraid: 'GBRAID',
            fbclid: 'FBCLID',
            msclkid: 'MSCLKID',
            ttclid: 'TTCLID',
            landing_page: 'LANDING_PAGE',
            landing_referrer: 'LANDING_REFERRER',
            form_name: 'FORM_NAME',
            consent_snapshot: 'CONSENT_SNAPSHOT',
            consent_profile: 'CONSENT_PROFILE',
            timestamp: 'TIMESTAMP',
            event_name: 'EVENT_NAME',
        },
    };

    var unknownEventKeys = Object.create(null);
    var ATTRIBUTION_STORAGE_KEY = 'tm_attribution_v1';
    var AD_LANDING_SESSION_KEY = 'tm_ad_landing_tracked';
    var ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
    var CONSENT_CHANGE_EVENT = 'tm:consent-updated';
    var ATTRIBUTION_KEYS = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'gclid',
        'wbraid',
        'gbraid',
        'fbclid',
        'msclkid',
        'ttclid',
    ];
    var cachedConsentContext = {
        consent_profile: 'global_strict',
        consent_snapshot: {
            ad_storage: '',
            analytics_storage: '',
            ad_user_data: '',
            ad_personalization: '',
        },
    };

    function getLabels() {
        return window.__TM_ANALYTICS_LABELS__ || TM_ANALYTICS_LABELS_EMBED;
    }

    function getConsentProfile() {
        if (window.__TM_TAGGING_CONFIG__ && window.__TM_TAGGING_CONFIG__.consent_profile) {
            return String(window.__TM_TAGGING_CONFIG__.consent_profile);
        }
        return 'global_strict';
    }

    function getConsentState() {
        if (window.__TM_CONSENT_STATE__ && typeof window.__TM_CONSENT_STATE__ === 'object') {
            return window.__TM_CONSENT_STATE__;
        }
        return {};
    }

    function isGranted(value) {
        return String(value || '').toLowerCase() === 'granted';
    }

    function getConsentSnapshot() {
        var state = getConsentState();
        return {
            ad_storage: String(state.ad_storage || ''),
            analytics_storage: String(state.analytics_storage || ''),
            ad_user_data: String(state.ad_user_data || ''),
            ad_personalization: String(state.ad_personalization || ''),
        };
    }

    function refreshConsentContext() {
        cachedConsentContext = {
            consent_profile: getConsentProfile(),
            consent_snapshot: getConsentSnapshot(),
        };
    }

    function canPersistAttribution() {
        var profile = getConsentProfile();
        var state = getConsentState();
        if (profile === 'us_open') {
            // US pages are permissive by default, but explicit deny must disable persistence.
            return !String(state.ad_storage || '').toLowerCase().startsWith('denied');
        }
        // EU/global strict profiles require explicit ad consent grant.
        return isGranted(state.ad_storage);
    }

    function sanitizePathFromUrl(url) {
        if (!url) return '';
        try {
            var parsed = new URL(url, window.location.origin);
            return parsed.pathname || '';
        } catch (e) {
            return '';
        }
    }

    function sanitizeReferrerPath(referrer) {
        if (!referrer) return '';
        try {
            var parsed = new URL(referrer);
            return parsed.origin + parsed.pathname;
        } catch (e) {
            return '';
        }
    }

    function hasPaidAttribution(payload) {
        if (!payload) return false;
        for (var i = 0; i < ATTRIBUTION_KEYS.length; i++) {
            if (payload[ATTRIBUTION_KEYS[i]]) return true;
        }
        return false;
    }

    function readAttributionFromUrl() {
        var out = {};
        try {
            var params = new URLSearchParams(window.location.search || '');
            ATTRIBUTION_KEYS.forEach(function (key) {
                var value = params.get(key);
                if (!value) return;
                out[key] = String(value).trim().slice(0, 200);
            });
        } catch (e) {}
        out.landing_page = window.location.pathname || '/';
        out.landing_referrer = sanitizeReferrerPath(document.referrer || '');
        return out;
    }

    function emptyAttributionValues() {
        var values = {};
        for (var i = 0; i < ATTRIBUTION_KEYS.length; i++) {
            values[ATTRIBUTION_KEYS[i]] = '';
        }
        values.landing_page = '';
        values.landing_referrer = '';
        return values;
    }

    function mapAttributionValues(input) {
        var values = emptyAttributionValues();
        if (!input || typeof input !== 'object') return values;
        for (var i = 0; i < ATTRIBUTION_KEYS.length; i++) {
            var key = ATTRIBUTION_KEYS[i];
            values[key] = input[key] ? String(input[key]).slice(0, 200) : '';
        }
        values.landing_page = input.landing_page ? String(input.landing_page).slice(0, 200) : '';
        values.landing_referrer = input.landing_referrer ? String(input.landing_referrer).slice(0, 200) : '';
        return values;
    }

    function readStoredAttributionRecord() {
        try {
            var raw = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (!parsed.values || typeof parsed.values !== 'object') return null;
            var capturedAt = Number(parsed.captured_at || 0);
            if (!capturedAt || Date.now() - capturedAt > ATTRIBUTION_TTL_MS) return null;
            return {
                captured_at: capturedAt,
                values: mapAttributionValues(parsed.values),
            };
        } catch (e) {
            return null;
        }
    }

    function saveAttribution(values) {
        if (!values || typeof values !== 'object') return;
        var record = {
            captured_at: Date.now(),
            values: mapAttributionValues(values),
        };
        try {
            localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(record));
        } catch (e) {}
    }

    function clearAttribution() {
        try {
            localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
        } catch (e) {}
    }

    function initAttributionStore() {
        if (!canPersistAttribution()) {
            clearAttribution();
            return emptyAttributionValues();
        }
        var currentValues = mapAttributionValues(readAttributionFromUrl());
        var storedRecord = readStoredAttributionRecord();
        var storedValues = storedRecord ? storedRecord.values : emptyAttributionValues();
        if (hasPaidAttribution(currentValues)) {
            // Replace atomically with current landing attribution; avoid cross-campaign key mixing.
            saveAttribution(currentValues);
            return currentValues;
        }
        if (hasPaidAttribution(storedValues)) {
            return storedValues;
        }
        return currentValues;
    }

    var attributionState = initAttributionStore();

    function getAttributionPayload() {
        if (!canPersistAttribution()) {
            clearAttribution();
            return emptyAttributionValues();
        }
        if (hasPaidAttribution(attributionState)) {
            return attributionState;
        }
        var latestRecord = readStoredAttributionRecord();
        var latestValues = latestRecord ? latestRecord.values : null;
        if (latestValues && hasPaidAttribution(latestValues)) {
            attributionState = latestValues;
            return attributionState;
        }
        return attributionState || {};
    }

    function refreshAttributionState() {
        attributionState = initAttributionStore();
        refreshConsentContext();
    }

    /** Strip URL to origin + pathname (no credentials / query / hash). */
    function safeDestination(href) {
        if (!href || href === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return '';
        try {
            if (href.indexOf('http://') === 0 || href.indexOf('https://') === 0) {
                var u = new URL(href);
                return u.origin + u.pathname;
            }
            if (href.indexOf('/') === 0) return sanitizePathFromUrl(href) || href.split('?')[0].split('#')[0];
        } catch (e) {}
        return '';
    }

    function hasBannedParamKey(params) {
        if (!params) return false;
        var banned = /^(visitor_)?(email|e_mail|phone|message|name|first_?name|last_?name|fullname)$/i;
        for (var k in params) {
            if (Object.prototype.hasOwnProperty.call(params, k) && banned.test(String(k).trim())) return true;
        }
        return false;
    }

    function track(eventKey, params) {
        var labels = getLabels();
        var eventName = labels.eventNames[eventKey];
        if (!eventName) {
            if (!unknownEventKeys[eventKey]) unknownEventKeys[eventKey] = true;
            /* Unknown keys are dropped — intentional to avoid noisy prod consoles. */
            return;
        }
        if (hasBannedParamKey(params)) return;

        window.dataLayer = window.dataLayer || [];
        var paramAliases = labels.parameters || {};
        var parameterMap = {};
        var raw = Object.assign(
            {},
            getAttributionPayload(),
            cachedConsentContext,
            params || {}
        );
        for (var pk in raw) {
            if (!Object.prototype.hasOwnProperty.call(raw, pk)) continue;
            var alias = paramAliases[pk] || String(pk).toUpperCase();
            parameterMap[alias] = raw[pk];
        }

        var eventId =
            typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'tm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);

        var payload = {
            event: eventName,
            event_name: eventName,
            event_id: eventId,
            timestamp: new Date().toISOString(),
            page_path: window.location.pathname,
            parameters: parameterMap,
        };

        window.dataLayer.push(payload);
    }

    function trackPaidLandingOnce() {
        var payload = getAttributionPayload();
        if (!hasPaidAttribution(payload)) return;
        try {
            if (sessionStorage.getItem(AD_LANDING_SESSION_KEY) === '1') return;
            sessionStorage.setItem(AD_LANDING_SESSION_KEY, '1');
        } catch (e) {}
        track('ad_landing', {
            cta_id: 'ad_entry',
            landing_page: payload.landing_page || window.location.pathname,
            landing_referrer: payload.landing_referrer || '',
        });
    }

    function navSurfaceFromEl(el) {
        if (!el) return 'body';
        if (el.closest && el.closest('#mobileMenu')) return 'mobile_menu';
        if (el.closest && el.closest('#nav')) return 'primary_nav';
        return 'other';
    }

    function bindClickTracking() {
        document.addEventListener(
            'click',
            function (e) {
                var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
                var card = e.target && e.target.closest ? e.target.closest('.experience-card') : null;

                if (a && a.getAttribute) {
                    var href = a.getAttribute('href') || '';
                    var inNav = a.closest('#nav') || a.closest('#mobileMenu');
                    var path = safeDestination(href) || href;

                    if (href.indexOf('tel:') === 0) {
                        track('phone_click', {
                            cta_id: 'phone_link',
                            link_path: 'tel',
                        });
                        return;
                    }
                    if (href.indexOf('mailto:') === 0) {
                        track('email_click', {
                            cta_id: 'email_link',
                            link_path: 'mailto',
                        });
                        return;
                    }

                    if (inNav) {
                        if (href && href !== '#' && href.indexOf('javascript:') !== 0) {
                            track('nav_cta_click', {
                                link_path: safeDestination(href) || href.split('?')[0].split('#')[0],
                                nav_section: navSurfaceFromEl(a),
                                cta_id: (a.textContent || '').trim().slice(0, 80) || 'nav_link',
                            });
                        }
                        return;
                    }

                    if (path.indexOf('/gift-cards') !== -1 || href.indexOf('/gift-cards') !== -1) {
                        track('gift_card_click', { link_path: path, cta_id: 'gift_cards' });
                        return;
                    }
                    if (path.indexOf('/groups/') !== -1 || href.indexOf('/groups/') !== -1) {
                        track('cta_click', { link_path: path, cta_id: 'groups_tile' });
                        return;
                    }
                    if (
                        (path === '/missions' || path.indexOf('/missions') === 0) &&
                        (a.classList.contains('btn-secondary') || (a.closest && a.closest('.experiences')))
                    ) {
                        track('mission_card_click', { link_path: path, cta_id: 'missions_landing' });
                        return;
                    }
                }

                if (!card || card.getAttribute('aria-hidden') === 'true') return;
                var titleEl = card.querySelector('.experience-title');
                var title = titleEl ? String(titleEl.textContent || '').trim().slice(0, 120) : '';
                if (title) {
                    track('mission_card_click', {
                        mission_title: title,
                        cta_id: 'experience_card',
                    });
                    return;
                }
            },
            true
        );
    }

    window.TMAnalytics = {
        track: track,
        safeDestination: safeDestination,
    };

    refreshConsentContext();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            document.addEventListener(CONSENT_CHANGE_EVENT, refreshAttributionState);
            trackPaidLandingOnce();
            bindClickTracking();
        });
    } else {
        document.addEventListener(CONSENT_CHANGE_EVENT, refreshAttributionState);
        trackPaidLandingOnce();
        bindClickTracking();
    }
})();
