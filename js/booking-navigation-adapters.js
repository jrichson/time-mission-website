// ==========================================
// BOOKING NAVIGATION ADAPTERS
// ==========================================
(function () {
    'use strict';

    var BookingJourney = window.TMBookingJourney;
    if (!BookingJourney) throw new Error('TMBookingJourney must load before booking-navigation-adapters.js');

    var panelGetter = function () { return document.getElementById('ticketPanel'); };

    function configure(options) {
        var opts = options || {};
        if (typeof opts.getPanelEl === 'function') panelGetter = opts.getPanelEl;
    }

    function panelEl() {
        return panelGetter ? panelGetter() : document.getElementById('ticketPanel');
    }

    function navigateToHref(href) {
        if (BookingJourney.isExternalHttpUrl(href) && typeof window.open === 'function') {
            var opened = window.open(href, '_blank', 'noopener');
            if (opened && typeof opened.opener !== 'undefined') opened.opener = null;
            return;
        }
        window.location.assign(href);
    }

    function bookingFrameProvider() {
        return window.TMBookingFrame || null;
    }

    function briqProvider() {
        return window.TMBookingBriq || null;
    }

    function setBriqPanelMode(enabled) {
        var panel = panelEl();
        if (!panel || !panel.classList) return;
        if (enabled) panel.classList.add('ticket-panel--briq');
        else panel.classList.remove('ticket-panel--briq');
    }

    function hideBriqWidget(options) {
        var provider = briqProvider();
        if (provider && typeof provider.close === 'function') {
            provider.close(options);
            return;
        }
        setBriqPanelMode(false);
    }

    function openBriqWidget(loc) {
        var provider = briqProvider();
        if (provider && typeof provider.open === 'function') provider.open(loc);
    }

    function showBookingFrame(loc, href) {
        var frame = bookingFrameProvider();
        return !!(frame && typeof frame.show === 'function' && frame.show(loc, href));
    }

    function loadRollerCheckout(loc, onReady, onError) {
        var checkoutUrl = (loc && loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        if (!checkoutUrl) {
            if (typeof onError === 'function') onError();
            return;
        }
        var existing = document.getElementById('roller-checkout');
        if (existing && existing.getAttribute('data-checkout') !== checkoutUrl && existing.parentNode) {
            existing.parentNode.removeChild(existing);
            existing = null;
        }
        if (existing && window.RollerCheckout && typeof window.RollerCheckout.show === 'function') {
            onReady();
            return;
        }
        if (existing) {
            existing.addEventListener('load', onReady, { once: true });
            existing.addEventListener('error', onError || function () {}, { once: true });
            return;
        }
        var script = document.createElement('script');
        script.id = 'roller-checkout';
        script.src = 'https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js';
        script.async = true;
        script.setAttribute('data-checkout', checkoutUrl);
        script.addEventListener('load', onReady, { once: true });
        script.addEventListener('error', onError || function () {}, { once: true });
        document.head.appendChild(script);
    }

    function showRollerCheckout(loc, fallback) {
        loadRollerCheckout(
            loc,
            function () {
                if (window.RollerCheckout && typeof window.RollerCheckout.show === 'function') {
                    window.RollerCheckout.show();
                    return;
                }
                if (typeof fallback === 'function') fallback();
            },
            fallback
        );
    }

    var navigationHandlers = {
        'external-site': function (action) {
            navigateToHref(action.href);
            return true;
        },
        'briq-widget': function (_action, loc) {
            openBriqWidget(loc);
            return true;
        },
        roller: function (action, loc) {
            showRollerCheckout(loc, function () { showBookingFrame(loc, action.href); });
            return true;
        },
        iframe: function (action, loc) {
            showBookingFrame(loc, action.href);
            return true;
        },
        link: function (action) {
            navigateToHref(action.href);
            return true;
        },
    };

    function execute(action, loc) {
        var resolvedAction = action || {};
        var provider = resolvedAction.provider || resolvedAction.type || 'link';
        var handler = navigationHandlers[provider] || navigationHandlers.link;
        return handler(resolvedAction, loc);
    }

    window.TMBookingNavigationAdapters = {
        configure: configure,
        execute: execute,
        hideBriqWidget: hideBriqWidget,
        navigateToHref: navigateToHref,
        setBriqPanelMode: setBriqPanelMode,
        showBookingFrame: showBookingFrame,
    };
})();
