// ==========================================
// TICKET PANEL — UI module
// Pure DOM behavior: open/close panel, hydrate location dropdown.
// All booking URL logic lives in js/booking-controller.js (window.TMBooking).
// ==========================================
(function () {
    'use strict';

    var ticketPanel    = document.getElementById('ticketPanel');
    var ticketOverlay  = document.getElementById('ticketOverlay');
    var ticketClose    = document.getElementById('ticketClose');
    var ticketLocSel   = document.getElementById('ticketLocation');
    var ticketBookBtn  = document.getElementById('ticketBookBtn');
    var pageLocation   = (document.body && document.body.dataset.location) || '';

    if (!ticketPanel || !ticketLocSel) return;

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
                return {
                    value: loc.id,
                    label: loc.shortName + (loc.status === 'coming-soon' ? ' (Coming Soon)' : ''),
                };
            });
        }
        if (!options.length) return;
        var prev = ticketLocSel.value;
        ticketLocSel.textContent = '';
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
        // Pre-select saved location, if any
        var current = (window.TM && window.TM.current) || null;
        if (current && (current.id || current.slug) && ticketLocSel) {
            ticketLocSel.value = (current.id || current.slug || '').toLowerCase().trim().replace(/\s+/g, '-');
        }
        ticketPanel.classList.add('active');
        if (ticketOverlay) ticketOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Keep TICKET_PANEL_OPEN parity. Direct call (not via a tmTrack helper)
        // — booking-controller owns location_select + booking_click events.
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

    // Hand panel + CTA off to TMBooking. mount() will:
    //   - mark #ticketBookBtn as [data-tm-booking-trigger]
    //   - bind change handler on #ticketLocation
    //   - keep CTA href in sync with dropdown
    //   - delegate clicks via TMBooking.attach
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

    // Listen for programmatic TMBooking.open() invocations.
    document.addEventListener('tm:booking:open', function (ev) {
        openTicketPanel(ev);
    });

    // Close handlers (UI-local)
    if (ticketClose)   ticketClose.addEventListener('click', closeTicketPanel);
    if (ticketOverlay) ticketOverlay.addEventListener('click', closeTicketPanel);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && ticketPanel.classList.contains('active')) closeTicketPanel();
    });

    // Hydrate dropdown when locations data arrives.
    var ctx = getLocationContext();
    if (ctx && ctx.ready && typeof ctx.ready.then === 'function') {
        // window.TM.ready guard (booking-policies.cjs requires the literal string)
        ctx.ready.then(syncLocationOptions);
    }

    // No public ticket-panel global — booking surface lives on window.TMBooking.
})();
