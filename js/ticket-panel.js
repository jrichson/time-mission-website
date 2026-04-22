// ==========================================
// TICKET POPUP PANEL — Shared across all pages
// Single source of truth for booking logic
// On index: Book Now opens ticket panel, Continue routes through location page
// On location pages: Book Now navigates directly to booking
// Supports ?book=1 auto-redirect from ticket panel flow
// ==========================================
(function () {
    'use strict';

    var ticketPanel = document.getElementById('ticketPanel');
    var ticketOverlay = document.getElementById('ticketOverlay');
    var ticketClose = document.getElementById('ticketClose');
    var ticketLocationSelect = document.getElementById('ticketLocation');
    var ticketBookBtn = document.getElementById('ticketBookBtn');

    // Central booking URLs — keep aligned with data/locations.json.
    // Antwerp uses Experience Factory's booking (not Roller) — we route to email
    // until the operator provides a direct booking URL.
    // Houston is pre-launch — we route to its page (which has waitlist/info).
    var bookingUrls = {
        philadelphia: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
        'mount-prospect': 'https://ecom.roller.app/timemissionmountprospect/onlinecheckout/en-us/products',
        manassas: 'https://ecom.roller.app/timemissionmanassasmall/onlinecheckout/en-us/products',
        'west-nyack': 'https://tickets.timemission.com/onlinecheckout/en-us/products',
        lincoln: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
        houston: 'houston.html',
        antwerp: 'mailto:info@experience-factory.com?subject=Time%20Mission%20Antwerp%20Booking%20Request'
    };

    // Location page URLs — for routing through location page before booking
    var locationPages = {
        philadelphia: 'philadelphia.html',
        'mount-prospect': 'mount-prospect.html',
        manassas: 'manassas.html',
        'west-nyack': 'west-nyack.html',
        lincoln: 'lincoln.html',
        houston: 'houston.html',
        antwerp: 'antwerp.html'
    };

    // Detect if this is a location page (body has data-location attribute)
    var pageLocation = document.body.dataset.location || '';

    // --- Auto-redirect: location pages with ?book=1 go straight to booking ---
    if (pageLocation && window.location.search.indexOf('book=1') !== -1) {
        // Clean the URL so the back button doesn't trigger redirect again
        if (history.replaceState) {
            history.replaceState(null, '', window.location.pathname);
        }
        var autoUrl = bookingUrls[pageLocation];
        if (autoUrl) {
            // Wait for page to fully load so the history entry is established,
            // then redirect — back button will return to this location page
            window.addEventListener('load', function () {
                setTimeout(function () { window.location.href = autoUrl; }, 300);
            });
        }
    }

    if (!ticketPanel || !ticketLocationSelect) return;

    // Sync the "Continue to Booking" button with the selected location
    function syncBookingBtn() {
        if (!ticketBookBtn) return;
        var selected = ticketLocationSelect.value;
        var page = locationPages[selected];
        // On index/non-location pages: route through location page
        // On location pages: go directly to booking
        if (!pageLocation && page) {
            ticketBookBtn.href = page + '?book=1';
        } else {
            var url = bookingUrls[selected];
            ticketBookBtn.href = (url && url !== '') ? url : '#';
        }
    }

    // Open ticket panel
    function openTicketPanel(e) {
        // On location pages, if the clicked button has a real booking URL, navigate directly
        if (pageLocation && e && e.currentTarget && e.currentTarget.href && !e.currentTarget.href.endsWith('#')) {
            return; // Let the link navigate normally
        }
        if (e) e.preventDefault();

        // Pre-select saved location if available
        var saved = '';
        try { saved = localStorage.getItem('timeMissionLocation') || ''; } catch (err) {}
        if (saved && ticketLocationSelect) {
            ticketLocationSelect.value = saved.toLowerCase().replace(/\s+/g, '-');
        }

        syncBookingBtn();
        ticketPanel.classList.add('active');
        ticketOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Close ticket panel
    function closeTicketPanel() {
        ticketPanel.classList.remove('active');
        ticketOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // A URL is "direct" if it's an http(s) booking URL or a mailto/tel scheme —
    // in any of those cases we navigate straight there instead of opening the panel.
    function isDirectBookingUrl(href) {
        if (!href || href === '#') return false;
        return /^(https?:|mailto:|tel:)/i.test(href);
    }

    // Unified handler: if button has a direct URL, navigate; otherwise open the
    // ticket panel so the user can pick a location.
    function bookOrOpenPanel(e) {
        var btn = e.currentTarget;
        var href = btn.getAttribute('href');
        if (isDirectBookingUrl(href)) {
            e.preventDefault();
            // mailto/tel should stay in the same tab (new tabs often end up blank);
            // external booking URLs open in a new tab so the site stays put.
            if (/^(mailto:|tel:)/i.test(href)) {
                window.location.href = href;
            } else {
                window.open(href, '_blank');
            }
            return;
        }
        // No location — open ticket panel to choose
        openTicketPanel(e);
    }

    // Attach to all booking buttons site-wide
    var bookingButtons = document.querySelectorAll(
        '.btn-tickets, .btn-book-now, ' +
        '.btn-primary[href*="roller"], .btn-nav[href*="roller"], .btn-primary[href*="tickets.timemission"]'
    );
    bookingButtons.forEach(function (btn) {
        btn.addEventListener('click', bookOrOpenPanel);
    });

    // Close handlers
    if (ticketClose) ticketClose.addEventListener('click', closeTicketPanel);
    if (ticketOverlay) ticketOverlay.addEventListener('click', closeTicketPanel);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && ticketPanel.classList.contains('active')) {
            closeTicketPanel();
        }
    });

    // Update booking URL when location changes
    ticketLocationSelect.addEventListener('change', syncBookingBtn);

    // Handle "Continue to Booking" click
    if (ticketBookBtn) {
        ticketBookBtn.removeAttribute('target');
        ticketBookBtn.addEventListener('click', function (e) {
            var url = ticketBookBtn.getAttribute('href');
            if (!url || url === '#') {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            window.location.href = url;
        });
    }

    // Expose for external use
    window.TMTicketPanel = {
        open: openTicketPanel,
        close: closeTicketPanel,
        bookingUrls: bookingUrls
    };
})();
