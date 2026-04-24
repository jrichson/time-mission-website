/**
 * Site-wide Roller checkout overlay.
 *
 * Intercepts every Book Now click across the site, looks up the current
 * location, and routes it through RollerCheckout.show() when the location
 * has a Roller-enabled checkout. Falls through silently otherwise so the
 * existing ticket-panel.js behavior (open new tab / open slide-out panel)
 * still handles non-Roller locations.
 *
 * Current location is resolved as:
 *   1. The ticket slide-out dropdown (#ticketLocationSelect) for #ticketBookBtn
 *   2. The href slug for .location-info-book (location dropdown panel)
 *   3. body[data-location] on location pages
 *   4. localStorage['tm_location'] everywhere else
 *
 * To add a new Roller location: drop it into the rollerCheckouts map below.
 */
(function () {
    'use strict';

    var rollerCheckouts = {
        'philadelphia':   'https://tickets.timemission.com/timemissionphiladelphiapa/onlinecheckout/en-us/home',
        'mount-prospect': 'https://ecom.roller.app/timemissionmountprospect/onlinecheckout/en-us/home',
        'manassas':       'https://ecom.roller.app/timemissionmanassasmall/onlinecheckout/en-us/home'
    };

    // Inject the Roller CDN script once per page. The data-checkout here is a
    // placeholder; setCheckoutUrl() swaps it in before each show().
    if (!document.getElementById('roller-checkout')) {
        var s = document.createElement('script');
        s.id = 'roller-checkout';
        s.src = 'https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js';
        s.setAttribute('data-checkout', rollerCheckouts['philadelphia']);
        (document.head || document.documentElement).appendChild(s);
    }

    function normalize(slug) {
        return (slug || '').toLowerCase().replace(/\s+/g, '-');
    }

    function getPageLocation() {
        var body = document.body;
        if (body && body.dataset && body.dataset.location) return normalize(body.dataset.location);
        try { return normalize(localStorage.getItem('tm_location') || ''); } catch (e) { return ''; }
    }

    function resolveLocationForButton(btn) {
        if (btn.id === 'ticketBookBtn') {
            var sel = document.getElementById('ticketLocationSelect');
            return sel ? normalize(sel.value) : '';
        }
        if (btn.classList && btn.classList.contains('location-info-book')) {
            var href = (btn.getAttribute('href') || '').toLowerCase();
            var m = href.match(/([a-z-]+)\.html/);
            if (m) return m[1];
        }
        return getPageLocation();
    }

    function openRollerFor(slug) {
        var url = rollerCheckouts[slug];
        if (!url) return false;
        if (!window.RollerCheckout || typeof window.RollerCheckout.show !== 'function') return false;
        if (typeof window.RollerCheckout.setCheckoutUrl === 'function') {
            window.RollerCheckout.setCheckoutUrl(url);
        }
        window.RollerCheckout.show();
        return true;
    }

    // Capture phase so we run before ticket-panel.js's bubble-phase handlers
    // on the same buttons.
    document.addEventListener('click', function (e) {
        var btn = e.target.closest(
            '.btn-tickets, .btn-group-tickets, .location-info-book, .btn-book-now, #ticketBookBtn'
        );
        if (!btn) return;
        if (openRollerFor(resolveLocationForButton(btn))) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);
})();
