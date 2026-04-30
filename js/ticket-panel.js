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

    function normalizeLocation(value) {
        return (value || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

    function getLocation(id) {
        var normalized = normalizeLocation(id);
        if (window.TM && typeof window.TM.get === 'function') {
            return window.TM.get(normalized);
        }
        return null;
    }

    function getLocationPage(id) {
        var loc = getLocation(id);
        var slug = (loc && loc.slug) || normalizeLocation(id);
        return '/' + slug;
    }

    // Phase 5 BOOK-01 / D-03: rollerCheckoutUrl precedes bookingUrl for open venues.
    function resolveOpenCheckoutUrl(loc) {
        if (!loc) return '';
        if (loc.status === 'coming-soon') return '';
        var roller = (loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        if (roller !== '') return roller;
        var book = (loc.bookingUrl && String(loc.bookingUrl).trim()) || '';
        return book;
    }

    function getBookingUrl(id) {
        var loc = getLocation(id);
        if (!loc) return '';
        if (loc.status === 'coming-soon') return getLocationPage(loc.id);
        return resolveOpenCheckoutUrl(loc);
    }

    function syncLocationOptions() {
        if (!window.TM || !Array.isArray(window.TM.locations) || !ticketLocationSelect) return;
        var currentValue = ticketLocationSelect.value;
        ticketLocationSelect.textContent = '';
        window.TM.locations.forEach(function (loc) {
            var option = document.createElement('option');
            option.value = loc.id;
            option.textContent = loc.shortName + (loc.status === 'coming-soon' ? ' (Coming Soon)' : '');
            ticketLocationSelect.appendChild(option);
        });
        if (currentValue) ticketLocationSelect.value = currentValue;
    }

    // Detect if this is a location page (body has data-location attribute)
    var pageLocation = document.body.dataset.location || '';

    // --- Auto-redirect: location pages with ?book=1 go straight to booking ---
    function scheduleAutoRedirect() {
        // Clean the URL so the back button doesn't trigger redirect again
        if (history.replaceState) {
            history.replaceState(null, '', window.location.pathname);
        }
        var autoUrl = getBookingUrl(pageLocation);
        if (autoUrl) {
            // Wait for page to fully load so the history entry is established,
            // then redirect — back button will return to this location page
            window.addEventListener('load', function () {
                setTimeout(function () { window.location.href = autoUrl; }, 300);
            });
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
        var page = getLocationPage(selected);
        // On index/non-location pages: route through location page
        // On location pages: go directly to booking
        if (!pageLocation && page) {
            ticketBookBtn.href = page + '?book=1';
        } else {
            var url = getBookingUrl(selected);
            ticketBookBtn.href = url || '#';
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
        try { saved = localStorage.getItem('tm_location') || localStorage.getItem('timeMissionLocation') || ''; } catch (err) {}
        if (saved && ticketLocationSelect) {
            ticketLocationSelect.value = normalizeLocation(saved);
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
            if (/^(mailto:|tel:)/i.test(href)) {
                window.location.href = href;
            } else {
                // D-01: same-tab default for external checkout (Phase 5).
                window.location.assign(href);
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

    if (window.TM && window.TM.ready) {
        window.TM.ready.then(function () {
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
                window.location.href = url;
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
