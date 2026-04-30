// ==========================================
// TICKET POPUP PANEL — Shared across all pages
// Ticket panel UI + TMBooking integration
// Supports ?book=1 auto-redirect from ticket panel flow
// ==========================================
(function () {
    'use strict';

    var ticketPanel = document.getElementById('ticketPanel');
    var ticketOverlay = document.getElementById('ticketOverlay');
    var ticketClose = document.getElementById('ticketClose');
    var ticketLocationSelect = document.getElementById('ticketLocation');
    var ticketBookBtn = document.getElementById('ticketBookBtn');
    var pageLocation = document.body.dataset.location || '';

    function getLocationContext() {
        if (window.LocationContext) return window.LocationContext;
        if (!window.TM) return null;
        return {
            ready: window.TM.ready,
            get: typeof window.TM.get === 'function' ? window.TM.get.bind(window.TM) : function () { return null; },
            getCurrent: function () { return window.TM.current || null; },
            resolveBookingUrl: function (kind, id) {
                var loc = id && typeof window.TM.get === 'function' ? window.TM.get(id) : window.TM.current;
                if (!loc) return '';
                if (kind === 'gift-cards' || kind === 'giftcards') return loc.giftCardUrl || '';
                if (loc.status === 'coming-soon') return '/' + (loc.slug || loc.id || '');
                return loc.rollerCheckoutUrl || loc.bookingUrl || '';
            }
        };
    }

    function getTMBooking() {
        if (window.TMBooking) return window.TMBooking;
        return null;
    }

    function tmTrack(key, payload) {
        if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
            window.TMAnalytics.track(key, payload);
        }
    }

    function normalizeLocation(value) {
        return (value || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

    function getBookingUrl(id) {
        var booking = getTMBooking();
        if (booking && typeof booking.getDestination === 'function') {
            var resolved = booking.getDestination({
                kind: 'tickets',
                locationId: id,
                pageLocationSlug: pageLocation,
                preferLocationPageFlow: !pageLocation,
            });
            if (!pageLocation && resolved && /^\//.test(resolved) && resolved.indexOf('?') === -1) {
                var contextFromBooking = getLocationContext();
                var locFromBooking = contextFromBooking && typeof contextFromBooking.get === 'function'
                    ? contextFromBooking.get(id)
                    : null;
                if (locFromBooking && locFromBooking.status === 'coming-soon') {
                    return resolved + '?book=1';
                }
            }
            return resolved;
        }

        var context = getLocationContext();
        if (!context || typeof context.resolveBookingUrl !== 'function') return '';
        var fallbackResolved = context.resolveBookingUrl('tickets', id);
        if (!pageLocation) {
            var fallbackLoc = typeof context.get === 'function' ? context.get(id) : null;
            var fallbackSlug = fallbackLoc && (fallbackLoc.slug || fallbackLoc.id);
            if (fallbackSlug) {
                return '/' + fallbackSlug + '?book=1';
            }
        }
        return fallbackResolved;
    }

    function syncLocationOptions() {
        if (!ticketLocationSelect) return;
        var context = getLocationContext();
        var options = [];
        if (context && typeof context.listTicketOptions === 'function') {
            options = context.listTicketOptions();
        } else if (window.TM && Array.isArray(window.TM.locations)) {
            options = window.TM.locations.map(function (loc) {
                return {
                    value: loc.id,
                    label: loc.shortName + (loc.status === 'coming-soon' ? ' (Coming Soon)' : ''),
                };
            });
        }
        if (!options.length) return;
        var currentValue = ticketLocationSelect.value;
        ticketLocationSelect.textContent = '';
        options.forEach(function (entry) {
            var option = document.createElement('option');
            option.value = entry.value;
            option.textContent = entry.label;
            ticketLocationSelect.appendChild(option);
        });
        if (currentValue) ticketLocationSelect.value = currentValue;
    }

    // --- Auto-redirect: location pages with ?book=1 go straight to booking ---
    function scheduleAutoRedirect() {
        var autoUrl = getBookingUrl(pageLocation);
        var booking = getTMBooking();
        if (autoUrl && booking && typeof booking.navigate === 'function') {
            booking.navigate({
                source: 'book_param_auto',
                ctaId: 'book_param_auto',
                href: autoUrl,
                locationId: pageLocation,
                cleanBookParam: true,
                deferUntilLoad: true,
            });
            return;
        }

        if (autoUrl) {
            if (history.replaceState) history.replaceState(null, '', window.location.pathname);
            window.location.href = autoUrl;
        }
    }

    if (pageLocation && window.location.search.indexOf('book=1') !== -1) {
        if (window.TM && window.TM.ready) {
            window.TM.ready.then(scheduleAutoRedirect);
        } else {
            scheduleAutoRedirect();
        }
    }

    if (!ticketPanel || !ticketLocationSelect) return;

    // Sync the "Continue to Booking" button with the selected location
    function syncBookingBtn() {
        if (!ticketBookBtn) return;
        var selected = ticketLocationSelect.value;
        var url = getBookingUrl(selected);
        ticketBookBtn.href = url || '#';
    }

    // Open ticket panel
    function openTicketPanel(e) {
        if (e) e.preventDefault();

        // Pre-select saved location if available
        var saved = '';
        var context = getLocationContext();
        var current = context && typeof context.getCurrent === 'function' ? context.getCurrent() : null;
        if (current && (current.id || current.slug)) {
            saved = current.id || current.slug;
        }
        if (saved && ticketLocationSelect) {
            ticketLocationSelect.value = normalizeLocation(saved);
        }

        syncBookingBtn();
        ticketPanel.classList.add('active');
        ticketOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        tmTrack('ticket_panel_open', {
            location_slug: ticketLocationSelect ? ticketLocationSelect.value : '',
        });
    }

    // Close ticket panel
    function closeTicketPanel() {
        ticketPanel.classList.remove('active');
        ticketOverlay.classList.remove('active');
        document.body.style.overflow = '';
        tmTrack('ticket_panel_close', {
            location_slug: ticketLocationSelect ? ticketLocationSelect.value : '',
        });
    }

    // A URL is "direct" if it's an http(s) booking URL or a mailto/tel scheme —
    // in any of those cases we navigate straight there instead of opening the panel.
    // TMBooking owns this policy and invokes openTicketPanel only when needed.
    var booking = getTMBooking();
    if (booking && typeof booking.attach === 'function') {
        booking.attach(document, {
            selector: '[data-tm-booking-trigger]',
            pageLocationSlug: pageLocation,
            openPanel: openTicketPanel,
        });
    } else {
        document.querySelectorAll('[data-tm-booking-trigger]').forEach(function (button) {
            button.addEventListener('click', openTicketPanel);
        });
    }

    // Close handlers
    if (ticketClose) ticketClose.addEventListener('click', closeTicketPanel);
    if (ticketOverlay) ticketOverlay.addEventListener('click', closeTicketPanel);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && ticketPanel.classList.contains('active')) {
            closeTicketPanel();
        }
    });

    // Update booking URL when location changes
    ticketLocationSelect.addEventListener('change', function () {
        syncBookingBtn();
        tmTrack('location_select', {
            location_slug: ticketLocationSelect.value,
            cta_id: 'ticket_panel_dropdown',
        });
    });

    var locationContext = getLocationContext();
    if (locationContext && locationContext.ready && typeof locationContext.ready.then === 'function') {
        locationContext.ready.then(function () {
            syncLocationOptions();
            syncBookingBtn();
        });
    }

    // Handle "Continue to Booking" click
    if (ticketBookBtn) {
        ticketBookBtn.removeAttribute('target');
        ticketBookBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var url = ticketBookBtn.getAttribute('href');
            if (url && url !== '#') {
                var bookingGateway = getTMBooking();
                if (bookingGateway && typeof bookingGateway.navigate === 'function') {
                    bookingGateway.navigate({
                        source: 'ticket_panel_continue',
                        ctaId: 'ticket_panel_continue',
                        href: url,
                        locationId: ticketLocationSelect ? ticketLocationSelect.value : '',
                        event: e,
                    });
                } else {
                    tmTrack('booking_click', {
                        cta_id: 'ticket_panel_continue',
                        location_slug: ticketLocationSelect ? ticketLocationSelect.value : '',
                        destination_url: url.split('?')[0],
                    });
                    window.location.href = url;
                }
            }
        });
    }

    // Expose for external use
    window.TMTicketPanel = {
        open: openTicketPanel,
        close: closeTicketPanel,
        getBookingUrl: getBookingUrl
    };
})();
