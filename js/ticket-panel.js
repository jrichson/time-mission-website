(function () {
    'use strict';

    var ticketPanel    = document.getElementById('ticketPanel');
    var ticketOverlay  = document.getElementById('ticketOverlay');
    var ticketClose    = document.getElementById('ticketClose');
    var ticketLocSel   = document.getElementById('ticketLocation');
    var ticketBookBtn  = document.getElementById('ticketBookBtn');
    var pageLocation   = (document.body && document.body.dataset.location) || '';

    if (!ticketPanel || !ticketLocSel) return;

    function translate(key, fallback) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback);
        }
        if (window.TMI18n && typeof window.TMI18n.t === 'function') {
            var translated = window.TMI18n.t(key);
            if (typeof translated === 'string') return translated;
        }
        return fallback;
    }

    function getLocationContext() {
        if (window.LocationContext) return window.LocationContext;
        if (!window.TM) return null;
        return {
            ready: window.TM.ready,
            listTicketOptions: null,
        };
    }

    function syncLocationOptions() {
        var context = getLocationContext();
        var options = [];
        if (context && typeof context.listTicketOptions === 'function') {
            options = context.listTicketOptions();
        } else if (window.TM && Array.isArray(window.TM.locations)) {
            options = window.TM.locations.map(function (loc) {
                var suffix = '';
                if (loc.status === 'coming-soon') {
                    suffix = loc.rollerCheckoutUrl || loc.bookingUrl
                        ? ' (' + translate('booking.status.bookingNow', 'Booking Now') + ')'
                        : ' (' + translate('location.comingSoon', 'Coming Soon') + ')';
                }
                return {
                    value: loc.id,
                    label: loc.shortName + suffix,
                };
            });
        }
        if (!options.length) return;
        var prev = ticketLocSel.value;
        ticketLocSel.textContent = '';
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.setAttribute('data-i18n', 'booking.locationPlaceholder');
        placeholder.textContent = translate('booking.locationPlaceholder', 'Select a location');
        ticketLocSel.appendChild(placeholder);
        options.forEach(function (entry) {
            var opt = document.createElement('option');
            opt.value = entry.value;
            opt.textContent = entry.label;
            ticketLocSel.appendChild(opt);
        });
        if (prev) ticketLocSel.value = prev;
    }

    function openTicketPanel(e) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        var current = (window.TM && window.TM.current) || null;
        var activeLocation = (current && (current.id || current.slug)) || pageLocation;
        if (activeLocation && ticketLocSel) {
            ticketLocSel.value = String(activeLocation).toLowerCase().trim().replace(/\s+/g, '-');
        }
        ticketPanel.classList.add('active');
        if (ticketOverlay) ticketOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
            window.TMAnalytics.track('ticket_panel_open', {
                location_slug: ticketLocSel ? ticketLocSel.value : '',
            });
        }
    }

    function closeTicketPanel() {
        ticketPanel.classList.remove('active');
        if (ticketOverlay) ticketOverlay.classList.remove('active');
        document.body.style.overflow = '';
        if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
            window.TMAnalytics.track('ticket_panel_close', {
                location_slug: ticketLocSel ? ticketLocSel.value : '',
            });
        }
    }

    if (window.TMBooking && typeof window.TMBooking.mount === 'function') {
        window.TMBooking.mount(ticketPanel, {
            overlayEl: ticketOverlay,
            closeEl: ticketClose,
            selectEl: ticketLocSel,
            ctaEl: ticketBookBtn,
            pageLocationSlug: pageLocation,
            openPanel: openTicketPanel,
            closePanel: closeTicketPanel,
        });
    }

    document.addEventListener('tm:booking:open', function (ev) {
        openTicketPanel(ev);
    });

    if (ticketClose)   ticketClose.addEventListener('click', closeTicketPanel);
    if (ticketOverlay) ticketOverlay.addEventListener('click', closeTicketPanel);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && ticketPanel.classList.contains('active')) closeTicketPanel();
    });

    var ctx = getLocationContext();
    if (ctx && ctx.ready && typeof ctx.ready.then === 'function') {
        ctx.ready.then(syncLocationOptions);
    }

    document.addEventListener('tm:language-changed', syncLocationOptions);

})();
