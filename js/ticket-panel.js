// ==========================================
// TICKET POPUP PANEL — Shared across all pages
// Single source of truth for booking logic
// ==========================================
(function () {
    'use strict';

    var ticketPanel = document.getElementById('ticketPanel');
    var ticketOverlay = document.getElementById('ticketOverlay');
    var ticketClose = document.getElementById('ticketClose');
    var ticketLocationSelect = document.getElementById('ticketLocation');
    var ticketBookBtn = document.getElementById('ticketBookBtn');

    if (!ticketPanel || !ticketLocationSelect) return;

    // Central booking URLs — SINGLE SOURCE OF TRUTH
    // Update here and every page picks it up automatically
    var bookingUrls = {
        philadelphia: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
        'mount-prospect': 'https://ecom.roller.app/timemissionmountprospect/onlinecheckout/en-us/products',
        manassas: 'https://ecom.roller.app/timemissionmanassasmall/onlinecheckout/en-us/products',
        'west-nyack': '',
        lincoln: '',
        houston: '',
        antwerp: ''
    };

    // Detect if this is a location page (body has data-location attribute)
    var pageLocation = document.body.dataset.location || '';

    // Sync the "Continue to Booking" button href with the selected location
    function syncBookingBtn() {
        if (!ticketBookBtn) return;
        var selected = ticketLocationSelect.value;
        var url = bookingUrls[selected];
        ticketBookBtn.href = (url && url !== '') ? url : '#';
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

    // Attach click handlers to all booking buttons
    var bookingButtons = document.querySelectorAll('.btn-tickets, .btn-primary[href*="roller"], .btn-nav[href*="roller"], .btn-primary[href*="tickets.timemission"]');
    bookingButtons.forEach(function (btn) {
        btn.addEventListener('click', openTicketPanel);
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

    // Expose for external use
    window.TMTicketPanel = {
        open: openTicketPanel,
        close: closeTicketPanel,
        bookingUrls: bookingUrls
    };
})();
