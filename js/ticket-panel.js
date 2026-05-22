(function () {
    'use strict';

    var ticketPanel    = document.getElementById('ticketPanel');
    var ticketOverlay  = document.getElementById('ticketOverlay');
    var ticketClose    = document.getElementById('ticketClose');
    var ticketLocSel   = document.getElementById('ticketLocation');
    var ticketBookBtn  = document.getElementById('ticketBookBtn');
    var pageLocation   = (document.body && document.body.dataset.location) || '';
    var lastFocusedBeforePanel = null;

    if (!ticketPanel || !ticketLocSel) return;

    function translate(key, fallback) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback);
        }
        return fallback;
    }

    function getLocationContext() {
        if (window.LocationContext) return window.LocationContext;
        if (!window.TM) return null;
        return {
            ready: window.TM.ready,
            getCurrent: function () { return window.TM.current || null; },
            listTicketOptions: null,
        };
    }

    function syncLocationOptions() {
        var context = getLocationContext();
        var options = [];
        if (context && typeof context.listTicketOptions === 'function') {
            options = context.listTicketOptions();
        } else if (
            window.TMLocationViews
            && typeof window.TMLocationViews.listTicketOptions === 'function'
            && window.TM
            && Array.isArray(window.TM.locations)
        ) {
            options = window.TMLocationViews.listTicketOptions(window.TM.locations);
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
        if (!ticketPanel.classList.contains('active')) {
            lastFocusedBeforePanel = document.activeElement && document.activeElement !== document.body
                ? document.activeElement
                : null;
        }
        var context = getLocationContext();
        var current = context && typeof context.getCurrent === 'function' ? context.getCurrent() : null;
        var activeLocation = (current && (current.id || current.slug)) || pageLocation;
        if (activeLocation && ticketLocSel) {
            ticketLocSel.value = String(activeLocation).toLowerCase().trim().replace(/\s+/g, '-');
        }
        ticketPanel.removeAttribute('aria-hidden');
        ticketPanel.removeAttribute('inert');
        ticketPanel.classList.add('active');
        if (ticketOverlay) ticketOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        window.requestAnimationFrame(function () {
            if (!ticketPanel.classList.contains('ticket-panel--briq') && ticketClose && typeof ticketClose.focus === 'function') {
                ticketClose.focus({ preventScroll: true });
            }
        });
        if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
            window.TMAnalytics.track('ticket_panel_open', {
                location_slug: ticketLocSel ? ticketLocSel.value : '',
            });
        }
    }

    function closeTicketPanel() {
        if (window.TMBooking && typeof window.TMBooking.closeBriqWidget === 'function') {
            window.TMBooking.closeBriqWidget();
        } else {
            ticketPanel.classList.remove('ticket-panel--briq');
        }
        ticketPanel.classList.remove('active');
        if (ticketOverlay) ticketOverlay.classList.remove('active');
        document.body.style.overflow = '';
        var restoreTarget = lastFocusedBeforePanel;
        lastFocusedBeforePanel = null;
        if (restoreTarget && document.contains(restoreTarget) && typeof restoreTarget.focus === 'function') {
            restoreTarget.focus({ preventScroll: true });
        }
        ticketPanel.setAttribute('aria-hidden', 'true');
        ticketPanel.setAttribute('inert', '');
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
