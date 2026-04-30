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
            cta_click: 'CTA_CLICK',
            booking_click: 'BOOKING_CLICK',
            checkout_start: 'CHECKOUT_START',
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
            form_name: 'FORM_NAME',
            consent_snapshot: 'CONSENT_SNAPSHOT',
            timestamp: 'TIMESTAMP',
            event_name: 'EVENT_NAME',
        },
    };

    var unknownEventKeys = Object.create(null);

    function getLabels() {
        return window.__TM_ANALYTICS_LABELS__ || TM_ANALYTICS_LABELS_EMBED;
    }

    /** Strip URL to origin + pathname (no credentials / query / hash). */
    function safeDestination(href) {
        if (!href || href === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return '';
        try {
            if (href.indexOf('http://') === 0 || href.indexOf('https://') === 0) {
                var u = new URL(href);
                return u.origin + u.pathname;
            }
            if (href.indexOf('/') === 0) return href.split('?')[0].split('#')[0];
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
        var raw = params || {};
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
            page_path: window.location.pathname + window.location.search,
            parameters: parameterMap,
        };

        window.dataLayer.push(payload);
    }

    function navSurfaceFromEl(el) {
        if (!el) return 'body';
        if (el.closest && el.closest('#mobileMenu')) return 'mobile_menu';
        if (el.closest && el.closest('#nav')) return 'primary_nav';
        return 'other';
    }

    function bindNavClicks() {
        document.addEventListener(
            'click',
            function (e) {
                var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
                if (!a || !a.getAttribute) return;
                var nav = a.closest('#nav') || a.closest('#mobileMenu');
                if (!nav) return;
                var href = a.getAttribute('href') || '';
                if (href === '#' || href.indexOf('javascript:') === 0) return;
                track('nav_cta_click', {
                    link_path: safeDestination(href) || href.split('?')[0].split('#')[0],
                    nav_section: navSurfaceFromEl(a),
                    cta_id: (a.textContent || '').trim().slice(0, 80) || 'nav_link',
                });
            },
            true
        );
    }

    function bindCtaLinks() {
        document.addEventListener(
            'click',
            function (e) {
                var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
                if (!a) return;
                var href = a.getAttribute('href') || '';
                if (!href || href === '#') return;
                if (a.closest('#nav') || a.closest('#mobileMenu')) return;

                var path = safeDestination(href) || href;

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
                }
            },
            true
        );
    }

    function bindMissionCards() {
        document.addEventListener(
            'click',
            function (e) {
                var card = e.target && e.target.closest ? e.target.closest('.experience-card') : null;
                if (!card || card.getAttribute('aria-hidden') === 'true') return;
                var titleEl = card.querySelector('.experience-title');
                var title = titleEl ? String(titleEl.textContent || '').trim().slice(0, 120) : '';
                if (title) track('mission_card_click', { mission_title: title, cta_id: 'experience_card' });
            },
            true
        );
    }

    window.TMAnalytics = {
        track: track,
        safeDestination: safeDestination,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            bindNavClicks();
            bindCtaLinks();
            bindMissionCards();
        });
    } else {
        bindNavClicks();
        bindCtaLinks();
        bindMissionCards();
    }
})();
