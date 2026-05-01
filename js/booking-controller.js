// ==========================================
// BOOKING CONTROLLER
// Explicit booking trigger contract.
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

        if (kind === 'gift-cards' || kind === 'giftcards') {
            return loc.giftCardUrl || '';
        }

        if (kind === 'groups') {
            return loc.groupsUrl || '';
        }

        var slug = loc.slug || loc.id || locationId || pageLocationSlug;
        if (loc.status === 'coming-soon') {
            return slug ? '/' + slug : '';
        }

        if (preferLocationPageFlow && slug) {
            return '/' + slug + '?book=1';
        }

        return resolveOpenCheckoutUrl(loc);
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

    window.BookingController = {
        attach: attach,
        isDirectBookingUrl: isDirectBookingUrl
    };
    window.TMBooking = {
        attach: attach,
        getDestination: getDestination,
        navigate: navigate,
        isDirectBookingUrl: isDirectBookingUrl,
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
