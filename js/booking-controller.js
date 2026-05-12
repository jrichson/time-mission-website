// ==========================================
// BOOKING CONTROLLER
// Single canonical booking gateway (RFC-10).
// All booking URL math, analytics tracking, panel mount, and the ?book=1
// auto-redirect live here on window.TMBooking.
// ==========================================
(function () {
    'use strict';

    function getLocationContext() {
        if (window.LocationContext) return window.LocationContext;
        if (!window.TM) return null;
        return {
            ready: window.TM.ready,
            get: typeof window.TM.get === 'function' ? window.TM.get.bind(window.TM) : function () { return null; },
            getCurrent: function () { return window.TM.current || null; },
        };
    }

    function getLocation(id) {
        var context = getLocationContext();
        if (!context) return null;
        if (id && typeof context.get === 'function') return context.get(id);
        if (typeof context.getCurrent === 'function') return context.getCurrent();
        return null;
    }

    function normalizeLocation(value) {
        return (value || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

    function normalizeGroupType(value) {
        return normalizeLocation(value).replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    function normalizeKind(value) {
        return normalizeLocation(value || 'tickets');
    }

    function isDirectBookingUrl(href) {
        if (!href || href === '#') return false;
        return /^(https?:|mailto:|tel:)/i.test(href);
    }

    function isNavigableHref(href) {
        var value = String(href || '').trim();
        return !!value && value !== '#' && !/^javascript:/i.test(value);
    }

    function locationForOptions(opts) {
        opts = opts || {};
        var locationId = normalizeLocation(opts.locationId || '');
        var pageLocationSlug = normalizeLocation(opts.pageLocationSlug || '');
        return getLocation(locationId) || getLocation(pageLocationSlug) || getLocation(null);
    }

    function resolveOpenCheckoutUrl(loc) {
        if (!loc || loc.status === 'coming-soon') return '';
        var roller = (loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        if (roller !== '') return roller;
        var booking = (loc.bookingUrl && String(loc.bookingUrl).trim()) || '';
        return booking;
    }

    function resolveLocationDestination(loc, options) {
        var opts = options || {};
        if (!loc) return '';
        var kind = normalizeKind(opts.kind || 'tickets');

        if (kind === 'gift-cards' || kind === 'giftcards') {
            return loc.giftCardUrl || '';
        }

        if (kind === 'waiver' || kind === 'waivers') {
            return loc.waiverUrl || '';
        }

        if (kind === 'groups') {
            var groupType = normalizeGroupType(opts.groupType || opts.pageGroupType || '');
            var groupUrls = loc.groupFormUrls || {};
            return (groupType && groupUrls[groupType]) || groupUrls.default || loc.groupsUrl || '';
        }

        var slug = loc.slug || loc.id || normalizeLocation(opts.locationId || opts.pageLocationSlug || '');
        if (loc.status === 'coming-soon') {
            return slug ? '/' + slug : '';
        }

        if (opts.preferLocationPageFlow && slug) {
            return '/' + slug + '?book=1';
        }

        return resolveOpenCheckoutUrl(loc);
    }

    function tmTrack(key, payload) {
        if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
            window.TMAnalytics.track(key, payload);
        }
    }

    function safeDestination(url) {
        if (window.TMAnalytics && typeof window.TMAnalytics.safeDestination === 'function') {
            return window.TMAnalytics.safeDestination(url) || url;
        }
        return url;
    }

    function getDestination(options) {
        var opts = options || {};
        var kind = normalizeKind(opts.kind || 'tickets');
        var locationId = normalizeLocation(opts.locationId || '');
        var pageLocationSlug = normalizeLocation(opts.pageLocationSlug || '');
        var preferLocationPageFlow = !!opts.preferLocationPageFlow;

        var loc = locationForOptions({
            locationId: locationId,
            pageLocationSlug: pageLocationSlug,
        });
        if (!loc) return '';

        return resolveLocationDestination(loc, {
            kind: kind,
            groupType: opts.groupType || opts.pageGroupType || '',
            locationId: locationId,
            pageLocationSlug: pageLocationSlug,
            preferLocationPageFlow: preferLocationPageFlow,
        });
    }

    /** RFC-10: canonical resolver alias. Thin wrapper over getDestination. */
    function resolve(opts) {
        return getDestination(opts);
    }

    function shouldUseRollerCheckout(loc, href, kind) {
        if (!loc || normalizeKind(kind) !== 'tickets') return false;
        var roller = (loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        return !!roller && href === roller;
    }

    function shouldUseBriqWidget(loc, kind) {
        var bookingKind = normalizeKind(kind);
        return !!(loc && (loc.briqWidget || loc.briqWidgetDomain) && (bookingKind === 'tickets' || bookingKind === 'groups'));
    }

    function loadRollerCheckout(loc, onReady, onError) {
        var checkoutUrl = (loc && loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        if (!checkoutUrl) {
            if (typeof onError === 'function') onError();
            return;
        }
        var existing = document.getElementById('roller-checkout');
        if (existing && existing.getAttribute('data-checkout') !== checkoutUrl && existing.parentNode) {
            existing.parentNode.removeChild(existing);
            existing = null;
        }
        if (existing && window.RollerCheckout && typeof window.RollerCheckout.show === 'function') {
            onReady();
            return;
        }
        if (existing) {
            existing.addEventListener('load', onReady, { once: true });
            existing.addEventListener('error', onError || function () {}, { once: true });
            return;
        }
        var script = document.createElement('script');
        script.id = 'roller-checkout';
        script.src = 'https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js';
        script.async = true;
        script.setAttribute('data-checkout', checkoutUrl);
        script.addEventListener('load', onReady, { once: true });
        script.addEventListener('error', onError || function () {}, { once: true });
        document.head.appendChild(script);
    }

    function showRollerCheckout(loc, fallback) {
        loadRollerCheckout(
            loc,
            function () {
                if (window.RollerCheckout && typeof window.RollerCheckout.show === 'function') {
                    window.RollerCheckout.show();
                    return;
                }
                if (typeof fallback === 'function') fallback();
            },
            fallback
        );
    }

    function loadBriqWidgetScript() {
        if (document.getElementById('briq-widget-script')) return;
        var script = document.createElement('script');
        script.id = 'briq-widget-script';
        script.src = 'https://widgetcdn.briqbookings.com/widget/widget.js';
        script.async = true;
        document.head.appendChild(script);
    }

    function navigate(intent) {
        var opts = intent || {};
        var href = opts.href;
        if (!href && opts.currentTarget && typeof opts.currentTarget.getAttribute === 'function') {
            href = opts.currentTarget.getAttribute('href');
        }
        if (!href || href === '#') {
            if (typeof opts.openPanel === 'function') {
                if (opts.event && typeof opts.event.preventDefault === 'function') opts.event.preventDefault();
                opts.openPanel(opts.event);
            }
            return false;
        }

        var kind = normalizeKind(opts.kind || (opts.currentTarget && opts.currentTarget.getAttribute('data-tm-booking-kind')) || 'tickets');
        var source = String(opts.source || 'generic_cta');
        var locationSlug = normalizeLocation(opts.locationId || opts.pageLocationSlug || '');
        var ctaId = opts.ctaId
            || (opts.currentTarget && opts.currentTarget.className && String(opts.currentTarget.className).split(' ')[0])
            || source;
        var loc = locationForOptions({
            locationId: opts.locationId || '',
            pageLocationSlug: opts.pageLocationSlug || '',
        });

        if (opts.event && typeof opts.event.preventDefault === 'function') opts.event.preventDefault();

        tmTrack('booking_click', {
            cta_id: ctaId,
            destination_url: safeDestination(href).split('?')[0],
            location_slug: locationSlug,
        });

        if (/^https?:\/\//i.test(href)) {
            tmTrack('checkout_start', {
                destination_url: safeDestination(href),
                location_slug: locationSlug,
                cta_id: source,
            });
        }

        if (opts.cleanBookParam && history.replaceState) {
            history.replaceState(null, '', window.location.pathname);
        }

        if (!opts.deferUntilLoad && shouldUseRollerCheckout(loc, href, kind)) {
            showRollerCheckout(loc, function () {
                window.location.assign(href);
            });
            return true;
        }

        if (opts.deferUntilLoad) {
            function doDeferredNav() {
                setTimeout(function () {
                    if (shouldUseRollerCheckout(loc, href, kind)) {
                        showRollerCheckout(loc, function () {
                            window.location.href = href;
                        });
                    } else {
                        window.location.href = href;
                    }
                }, 300);
            }
            // TM.ready often resolves after fetch — after window "load" already fired.
            // Listening for "load" alone never runs in that case (BOOK-04 / ?book=1 auto-redirect).
            if (document.readyState === 'complete') {
                doDeferredNav();
            } else {
                window.addEventListener('load', doDeferredNav);
            }
            return true;
        }

        window.location.assign(href);
        return true;
    }

    function attach(root, options) {
        var opts = options || {};
        if (!root) return function () {};
        var selector = opts.selector || '[data-tm-booking-trigger]';
        var openPanel = typeof opts.openPanel === 'function' ? opts.openPanel : null;
        var setPanelIntent = typeof opts.setPanelIntent === 'function' ? opts.setPanelIntent : null;
        var pageLocationSlug = opts.pageLocationSlug || '';
        var handler = typeof opts.handler === 'function' ? opts.handler : function (event) {
            var btn = event.currentTarget;
            var href = btn.getAttribute('href');
            var hasInitialHref = isNavigableHref(href);
            var kind = normalizeKind(btn.getAttribute('data-tm-booking-kind') || 'tickets');
            var groupType = normalizeGroupType(btn.getAttribute('data-tm-group-type') || btn.getAttribute('data-tm-page-group') || '');
            var locationId = normalizeLocation(btn.getAttribute('data-tm-location') || '');
            var loc = locationForOptions({
                locationId: locationId,
                pageLocationSlug: pageLocationSlug,
            });

            if (kind !== 'tickets' || !hasInitialHref) {
                var resolvedHref = getDestination({
                    kind: kind,
                    groupType: groupType,
                    locationId: locationId,
                    pageLocationSlug: pageLocationSlug,
                    preferLocationPageFlow: kind === 'tickets' && !pageLocationSlug,
                });
                if (resolvedHref) href = resolvedHref;
            }

            if (!hasInitialHref && shouldUseBriqWidget(loc, kind) && openPanel) {
                event.preventDefault();
                if (setPanelIntent) setPanelIntent({ kind: kind, groupType: groupType });
                openPanel(event);
                return;
            }

            if (hasInitialHref || (kind !== 'tickets' && isNavigableHref(href))) {
                navigate({
                    source: 'direct_booking',
                    href: href,
                    kind: kind,
                    groupType: groupType,
                    locationId: locationId,
                    pageLocationSlug: pageLocationSlug,
                    currentTarget: btn,
                    event: event,
                });
                return;
            }
            if (openPanel) {
                event.preventDefault();
                if (setPanelIntent) setPanelIntent({ kind: kind, groupType: groupType });
                openPanel(event);
            }
        };

        var buttons = Array.prototype.slice.call(root.querySelectorAll(selector));
        buttons.forEach(function (button) {
            button.addEventListener('click', handler);
        });
        return function detach() {
            buttons.forEach(function (button) {
                button.removeEventListener('click', handler);
            });
        };
    }

    // -----------------------------------------------------------------
    // RFC-10: Panel mount + open + auto-redirect (centralized in TMBooking)
    // -----------------------------------------------------------------

    var mountedPanel = null;

    /**
     * Programmatic ticket-panel open. Looks for a registered panel mount; if
     * none, dispatches a CustomEvent('tm:booking:open') so panel impls can
     * listen and open without TMBooking importing UI code.
     */
    function open(opts) {
        var detail = opts || {};
        if (mountedPanel && typeof mountedPanel.openPanel === 'function') {
            mountedPanel.openPanel(detail);
            return;
        }
        document.dispatchEvent(new CustomEvent('tm:booking:open', { detail: detail }));
    }

    /**
     * Wire a panel DOM (selectEl, ctaBtn, etc.) to TMBooking handlers.
     * panelEl optional — auto-discovers via #ticketPanel/#ticketLocation/#ticketBookBtn
     * if absent. Returns a small handle for callers (mainly { syncCtaHref }).
     */
    function mount(panelEl, opts) {
        var options = opts || {};
        var panel       = panelEl                || document.getElementById('ticketPanel');
        var locSelect   = options.selectEl       || document.getElementById('ticketLocation');
        var ctaBtn      = options.ctaEl          || document.getElementById('ticketBookBtn');
        var widgetEl    = options.widgetEl       || document.getElementById('ticketProviderWidget');
        var openPanel   = typeof options.openPanel === 'function' ? options.openPanel : null;
        var closePanel  = typeof options.closePanel === 'function' ? options.closePanel : null;
        var pageLocationSlug = normalizeLocation(options.pageLocationSlug || (document.body && document.body.dataset.location) || '');
        var panelIntent = { kind: 'tickets', groupType: '' };

        function selectedLocation() {
            return locationForOptions({
                locationId: locSelect ? locSelect.value : '',
                pageLocationSlug: pageLocationSlug,
            });
        }

        function syncPanelCopy() {
            if (!panel) return;
            var title = panel.querySelector('#ticketPanelTitle');
            var intro = panel.querySelector('#ticketPanelIntro');
            var ctaText = panel.querySelector('#ticketBookBtnText');
            var kind = normalizeKind(panelIntent.kind);
            if (kind === 'groups') {
                if (title) title.textContent = 'Plan Your Event';
                if (intro) intro.textContent = 'Select your location and we will send you to the right event request form.';
                if (ctaText) ctaText.textContent = 'Continue to Form';
            } else if (kind === 'waiver' || kind === 'waivers') {
                if (title) title.textContent = 'Complete Your Waiver';
                if (intro) intro.textContent = 'Select your location and we will send you to the correct waiver provider when one is available.';
                if (ctaText) ctaText.textContent = 'Continue to Waiver';
            } else {
                if (title) title.textContent = 'Book Your Adventure';
                if (intro) intro.textContent = "Select your location and we'll take you to our booking system to choose your date and time.";
                if (ctaText) ctaText.textContent = 'Continue to Booking';
            }
        }

        function setPanelIntent(intent) {
            var next = intent || {};
            panelIntent = {
                kind: normalizeKind(next.kind || 'tickets'),
                groupType: normalizeGroupType(next.groupType || next.pageGroupType || ''),
            };
            syncPanelCopy();
            syncCtaHref();
        }

        mountedPanel = {
            panelEl: panel,
            openPanel: function (detail) {
                setPanelIntent(detail);
                if (openPanel) openPanel(detail);
                syncCtaHref();
            },
            closePanel: closePanel,
            setPanelIntent: setPanelIntent,
        };

        // Mark CTA button as a booking trigger so attach() owns its click.
        if (ctaBtn) {
            ctaBtn.setAttribute('data-tm-booking-trigger', '');
            ctaBtn.removeAttribute('target');
        }

        function renderBriqWidget(loc) {
            if (!widgetEl) return;
            widgetEl.textContent = '';
            widgetEl.hidden = true;
            if (ctaBtn) ctaBtn.hidden = false;
            if (!shouldUseBriqWidget(loc, panelIntent.kind)) return;

            var config = loc.briqWidget || {};
            var domain = config.domain || loc.briqWidgetDomain;
            if (!domain) return;
            var widget = document.createElement('div');
            widget.id = 'briq-widget';
            widget.className = 'bw-widget';
            widget.setAttribute('data-domain', domain);
            widget.setAttribute('data-color-1-base', config.color1Base || '#FFBA00');
            widget.setAttribute('data-color-1-contrast', config.color1Contrast || '#010437');
            widget.setAttribute('data-color-2-base', config.color2Base || '#FFBA00');
            widget.setAttribute('data-color-2-contrast', config.color2Contrast || '#010437');
            widget.setAttribute('data-price-display', config.priceDisplay || 'PerPerson');
            widget.setAttribute('data-button-text', config.buttonText || 'BOOK NOW');
            widgetEl.appendChild(widget);
            widgetEl.hidden = false;
            if (ctaBtn) ctaBtn.hidden = true;
            loadBriqWidgetScript();
        }

        // Keep the CTA button's href in sync with the dropdown selection.
        function syncCtaHref() {
            if (!ctaBtn || !locSelect) return;
            var loc = selectedLocation();
            var url = getDestination({
                kind: panelIntent.kind,
                groupType: panelIntent.groupType,
                locationId: locSelect.value,
                pageLocationSlug: pageLocationSlug,
                preferLocationPageFlow: false,
            });
            // Coming-soon location-page flow: append ?book=1 if the resolved url is just /slug
            if (normalizeKind(panelIntent.kind) === 'tickets' && !pageLocationSlug && url && /^\//.test(url) && url.indexOf('?') === -1) {
                if (loc && loc.status === 'coming-soon') url += '?book=1';
            }
            ctaBtn.href = url || '#';
            ctaBtn.setAttribute('data-tm-booking-kind', panelIntent.kind);
            if (loc && (loc.id || loc.slug)) {
                ctaBtn.setAttribute('data-tm-location', loc.id || loc.slug);
            } else {
                ctaBtn.removeAttribute('data-tm-location');
            }
            if (panelIntent.groupType) {
                ctaBtn.setAttribute('data-tm-group-type', panelIntent.groupType);
            } else {
                ctaBtn.removeAttribute('data-tm-group-type');
            }
            renderBriqWidget(loc);
        }

        if (locSelect) {
            locSelect.addEventListener('change', function () {
                syncCtaHref();
                tmTrack('location_select', {
                    location_slug: locSelect.value,
                    cta_id: 'ticket_panel_dropdown',
                });
            });
        }

        // Defer the initial sync until TM data is hydrated.
        var ctx = (window.LocationContext || (window.TM && { ready: window.TM.ready })) || null;
        if (ctx && ctx.ready && typeof ctx.ready.then === 'function') {
            ctx.ready.then(syncCtaHref);
        } else {
            syncCtaHref();
        }

        // attach() binds [data-tm-booking-trigger] click delegation, so the CTA
        // button now flows through navigate() automatically. Don't add a second handler.
        attach(document, {
            selector: '[data-tm-booking-trigger]',
            pageLocationSlug: pageLocationSlug,
            openPanel: openPanel,
            setPanelIntent: setPanelIntent,
        });

        return { syncCtaHref: syncCtaHref };
    }

    /**
     * RFC-10 fix for BOOK-04 race: ?book=1 auto-redirect on a location page
     * deterministically waits for window.TM.ready before navigating. The
     * previous implementation in ticket-panel.js had a synchronous else-branch
     * fallthrough that could fire before TM hydration completed.
     */
    function scheduleAutoRedirect() {
        var pageLocationSlug = normalizeLocation((document.body && document.body.dataset.location) || '');
        if (!pageLocationSlug) return;
        if (window.location.search.indexOf('book=1') === -1) return;

        function doRedirect() {
            var href = getDestination({
                kind: 'tickets',
                locationId: pageLocationSlug,
                pageLocationSlug: pageLocationSlug,
                preferLocationPageFlow: false,
            });
            if (!href) return;
            navigate({
                source: 'book_param_auto',
                ctaId: 'book_param_auto',
                href: href,
                locationId: pageLocationSlug,
                cleanBookParam: true,
                deferUntilLoad: true,
            });
        }

        // Always wait for TM.ready. Never fall through synchronously even if
        // window.TM is not yet defined when this script runs. Poll briefly
        // (≤1s) for TM.ready, then resolve. Closes the BOOK-04 race where the
        // else branch fired before location data hydrated.
        function awaitTMReady(deadline) {
            if (window.TM && window.TM.ready && typeof window.TM.ready.then === 'function') {
                window.TM.ready.then(doRedirect);
                return;
            }
            if (Date.now() > deadline) {
                // Last resort after 1s: TM script never loaded. Better to navigate
                // to /slug than leave the user stranded on /slug?book=1 forever.
                doRedirect();
                return;
            }
            setTimeout(function () { awaitTMReady(deadline); }, 25);
        }
        awaitTMReady(Date.now() + 1000);
    }

    // Auto-boot on script load (defer is set on the <script>, so DOM is ready).
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleAutoRedirect);
    } else {
        scheduleAutoRedirect();
    }

    // -----------------------------------------------------------------
    // Public surface
    // -----------------------------------------------------------------

    window.BookingController = {
        attach: attach,
        isDirectBookingUrl: isDirectBookingUrl
    };
    window.TMBooking = {
        attach: attach,
        getDestination: getDestination,
        resolveLocationDestination: resolveLocationDestination,
        navigate: navigate,
        isDirectBookingUrl: isDirectBookingUrl,
        open: open,
        resolve: resolve,
        mount: mount,
    };

    /** Supported extension surface for new features (see docs/tm-public-api.md). */
    window.TMFacade = {
        get TM() {
            return window.TM;
        },
        get TMBooking() {
            return window.TMBooking;
        },
        get TMAnalytics() {
            return window.TMAnalytics;
        },
        get BookingController() {
            return window.BookingController;
        },
    };
})();
