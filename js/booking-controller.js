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

    function isDirectBookingUrl(href) {
        if (!href || href === '#') return false;
        return /^(https?:|mailto:|tel:)/i.test(href);
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
        var kind = String(opts.kind || 'tickets').toLowerCase();

        if (kind === 'gift-cards' || kind === 'giftcards') {
            return loc.giftCardUrl || '';
        }

        if (kind === 'groups') {
            return loc.groupsUrl || '';
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
        var kind = String(opts.kind || 'tickets').toLowerCase();
        var locationId = normalizeLocation(opts.locationId || '');
        var pageLocationSlug = normalizeLocation(opts.pageLocationSlug || '');
        var preferLocationPageFlow = !!opts.preferLocationPageFlow;

        var loc = getLocation(locationId) || getLocation(pageLocationSlug) || getLocation(null);
        if (!loc) return '';

        return resolveLocationDestination(loc, {
            kind: kind,
            locationId: locationId,
            pageLocationSlug: pageLocationSlug,
            preferLocationPageFlow: preferLocationPageFlow,
        });
    }

    /** RFC-10: canonical resolver alias. Thin wrapper over getDestination. */
    function resolve(opts) {
        return getDestination(opts);
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

        var source = String(opts.source || 'generic_cta');
        var locationSlug = normalizeLocation(opts.locationId || opts.pageLocationSlug || '');
        var ctaId = opts.ctaId
            || (opts.currentTarget && opts.currentTarget.className && String(opts.currentTarget.className).split(' ')[0])
            || source;

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

        if (opts.deferUntilLoad) {
            function doDeferredNav() {
                setTimeout(function () {
                    window.location.href = href;
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
        var pageLocationSlug = opts.pageLocationSlug || '';
        var handler = typeof opts.handler === 'function' ? opts.handler : function (event) {
            var btn = event.currentTarget;
            var href = btn.getAttribute('href');
            if (isDirectBookingUrl(href)) {
                navigate({
                    source: 'direct_booking',
                    href: href,
                    pageLocationSlug: pageLocationSlug,
                    currentTarget: btn,
                    event: event,
                });
                return;
            }
            if (openPanel) {
                event.preventDefault();
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
        var openPanel   = typeof options.openPanel === 'function' ? options.openPanel : null;
        var closePanel  = typeof options.closePanel === 'function' ? options.closePanel : null;
        var pageLocationSlug = normalizeLocation(options.pageLocationSlug || (document.body && document.body.dataset.location) || '');

        mountedPanel = { panelEl: panel, openPanel: openPanel, closePanel: closePanel };

        // Mark CTA button as a booking trigger so attach() owns its click.
        if (ctaBtn) {
            ctaBtn.setAttribute('data-tm-booking-trigger', '');
            ctaBtn.removeAttribute('target');
        }

        // Keep the CTA button's href in sync with the dropdown selection.
        function syncCtaHref() {
            if (!ctaBtn || !locSelect) return;
            var url = getDestination({
                kind: 'tickets',
                locationId: locSelect.value,
                pageLocationSlug: pageLocationSlug,
                preferLocationPageFlow: !pageLocationSlug,
            });
            // Coming-soon location-page flow: append ?book=1 if the resolved url is just /slug
            if (!pageLocationSlug && url && /^\//.test(url) && url.indexOf('?') === -1) {
                var loc = getLocation(locSelect.value);
                if (loc && loc.status === 'coming-soon') url += '?book=1';
            }
            ctaBtn.href = url || '#';
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
