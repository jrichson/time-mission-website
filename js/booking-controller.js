// ==========================================
// BOOKING CONTROLLER
// ==========================================
(function () {
    'use strict';

    var BookingJourney = window.TMBookingJourney;
    if (!BookingJourney) throw new Error('TMBookingJourney must load before booking-controller.js');
    var NavigationAdapters = window.TMBookingNavigationAdapters;
    if (!NavigationAdapters) throw new Error('TMBookingNavigationAdapters must load before booking-controller.js');

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

    function translate(key, fallback) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback);
        }
        return fallback;
    }

    function isDirectBookingUrl(href) {
        if (!href || href === '#') return false;
        return /^(https?:|mailto:|tel:)/i.test(href);
    }

    function syncExternalLinkAttrs(el, cta) {
        if (!el || !cta || cta.trigger) {
            if (el) {
                el.removeAttribute('target');
                el.removeAttribute('rel');
            }
            return;
        }
        var target = cta.target || (BookingJourney.isExternalHttpUrl(cta.href) ? '_blank' : '');
        var rel = cta.rel || (target === '_blank' ? 'noopener' : '');
        if (target) el.setAttribute('target', target);
        else el.removeAttribute('target');
        if (rel) el.setAttribute('rel', rel);
        else el.removeAttribute('rel');
    }

    function locationForOptions(opts) {
        opts = opts || {};
        var locationId = BookingJourney.normalizeLocation(opts.locationId || '');
        var pageLocationSlug = BookingJourney.normalizeLocation(opts.pageLocationSlug || '');
        return getLocation(locationId) || getLocation(pageLocationSlug) || getLocation(null);
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

    function cleanBookParamFromCurrentUrl() {
        if (!history.replaceState || !window.location || window.location.search.indexOf('book=1') === -1) return;
        var params = new URLSearchParams(window.location.search);
        params.delete('book');
        var nextSearch = params.toString();
        var nextUrl = window.location.pathname
            + (nextSearch ? '?' + nextSearch : '')
            + (window.location.hash || '');
        history.replaceState(null, '', nextUrl);
    }

    function getDestination(options) {
        var opts = options || {};
        return resolveBookingIntent({
            kind: opts.kind || 'tickets',
            groupType: opts.groupType || opts.pageGroupType || '',
            locationId: opts.locationId || '',
            pageLocationSlug: opts.pageLocationSlug || '',
            preferLocationPageFlow: !!opts.preferLocationPageFlow,
            resolveHref: true,
        }).href;
    }

    function selectSiteLocation(locationId, ctaId) {
        var normalized = BookingJourney.normalizeLocation(locationId || '');
        if (!normalized) return;
        var context = getLocationContext();
        var opts = ctaId ? { cta_id: ctaId } : undefined;
        if (context && typeof context.select === 'function') {
            context.select(normalized, opts);
            return;
        }
        if (window.TM && typeof window.TM.select === 'function') {
            window.TM.select(normalized, opts);
        }
    }

    function resolve(opts) {
        return getDestination(opts);
    }

    function resolveBookingIntent(options) {
        var opts = options || {};
        var currentTarget = opts.currentTarget || null;
        var kind = BookingJourney.normalizeKind(
            opts.kind
            || (currentTarget && currentTarget.getAttribute('data-tm-booking-kind'))
            || 'tickets'
        );
        var groupType = BookingJourney.normalizeGroupType(
            opts.groupType
            || opts.pageGroupType
            || (currentTarget && (currentTarget.getAttribute('data-tm-group-type') || currentTarget.getAttribute('data-tm-page-group')))
            || ''
        );
        var locationId = BookingJourney.normalizeLocation(
            opts.locationId
            || (currentTarget && currentTarget.getAttribute('data-tm-location'))
            || ''
        );
        var pageLocationSlug = BookingJourney.normalizeLocation(opts.pageLocationSlug || '');
        var loc = locationForOptions({
            locationId: locationId,
            pageLocationSlug: pageLocationSlug,
        });
        var href = String(opts.href || '').trim();
        if (!href && currentTarget) href = BookingJourney.getBookingHref(currentTarget);

        return BookingJourney.resolveIntent({
            href: href,
            kind: kind,
            groupType: groupType,
            locationId: locationId,
            pageLocationSlug: pageLocationSlug,
            location: loc,
            currentTarget: currentTarget,
            preferLocationPageFlow: !!opts.preferLocationPageFlow,
            resolveHref: opts.resolveHref,
        });
    }

    function panelCopyForIntent(loc, intent) {
        var kind = BookingJourney.normalizeKind((intent && intent.kind) || 'tickets');
        if (!loc) {
            return {
                title: translate('booking.chooseLocation.title', 'Choose Your Location'),
                intro: translate('booking.chooseLocation.intro', 'Select a location and we will show the right booking option.'),
                cta: translate('booking.chooseLocation.cta', 'Select Location First'),
            };
        }
        if (BookingJourney.isTemporarilyClosedLocation(loc)) {
            var closure = loc.temporaryClosure || {};
            return {
                title: String(closure.title || '').trim() || ((loc.shortName || loc.name || 'This location') + ' Is Temporarily Closed'),
                intro: String(closure.detail || closure.summary || '').trim() || 'Bookings are paused while this location is rebuilt.',
                cta: String(closure.ctaLabel || '').trim() || 'Get Closure Updates',
            };
        }
        if (intent && !intent.hasHref && (kind === 'groups' || kind === 'waiver' || kind === 'waivers' || kind === 'gift-cards' || kind === 'giftcards')) {
            var locationName = loc.shortName || loc.name || 'this location';
            if (kind === 'groups') {
                return {
                    title: translate('booking.groups.unavailableTitle', 'Group Requests Unavailable'),
                    intro: 'Group request forms are not available for ' + locationName + ' yet.',
                    cta: translate('booking.unavailable.cta', 'Unavailable'),
                };
            }
            if (kind === 'waiver' || kind === 'waivers') {
                return {
                    title: translate('booking.waiver.unavailableTitle', 'Waiver Unavailable'),
                    intro: 'A waiver link is not available for ' + locationName + ' yet.',
                    cta: translate('booking.unavailable.cta', 'Unavailable'),
                };
            }
            return {
                title: translate('booking.giftCards.unavailableTitle', 'Gift Cards Unavailable'),
                intro: 'Gift cards are not available for ' + locationName + ' yet.',
                cta: translate('booking.unavailable.cta', 'Unavailable'),
            };
        }
        if (kind === 'tickets' && BookingJourney.getExternalLocationUrl(loc)) {
            return {
                title: translate('booking.eu.title', 'Time Mission Europe'),
                intro: translate('booking.eu.intro', 'Continue to the EU-hosted site for this location.'),
                cta: translate('booking.eu.cta', 'Visit EU Site'),
            };
        }
        if ((kind === 'tickets' || kind === 'groups') && BookingJourney.isLeadOnlyComingSoon(loc)) {
            return {
                title: translate('booking.updates.title', 'Contact This Location'),
                intro: translate('booking.updates.intro', 'Select a coming-soon location and we will route your message to the right team.'),
                cta: translate('booking.updates.cta', 'Contact Us'),
            };
        }
        if (kind === 'groups') {
            return {
                title: translate('booking.groups.title', 'Plan Your Event'),
                intro: translate('booking.groups.intro', 'Select your location and we will send you to the right event request form.'),
                cta: translate('booking.groups.cta', 'Continue to Form'),
            };
        }
        if (intent && intent.usesBriqWidget && loc) {
            return {
                title: 'Book ' + (loc.shortName || loc.name || 'West Nyack'),
                intro: 'Choose your date, time, and ticket options for this location.',
                cta: translate('booking.cta.default', 'Book Now'),
            };
        }
        if (kind === 'waiver' || kind === 'waivers') {
            return {
                title: translate('booking.waiver.title', 'Complete Your Waiver'),
                intro: translate('booking.waiver.intro', 'Select your location and we will send you to the correct waiver provider when one is available.'),
                cta: translate('booking.waiver.cta', 'Continue to Waiver'),
            };
        }
        return {
            title: translate('booking.title.default', 'Book Your Adventure'),
            intro: translate('booking.intro.default', "Select your location and we'll take you to our booking system to choose your date and time."),
            cta: translate('booking.cta.default', 'Continue to Booking'),
        };
    }

    function syncCtaElementToIntent(ctaBtn, intent) {
        if (!ctaBtn) return;
        var cta = BookingJourney.ctaAttributesForIntent(intent);
        if (cta.disabled) {
            ctaBtn.href = '#';
            ctaBtn.removeAttribute('data-tm-booking-url');
            ctaBtn.removeAttribute('target');
            ctaBtn.removeAttribute('rel');
            ctaBtn.setAttribute('data-tm-booking-kind', cta.kind);
            if (cta.locationId) {
                ctaBtn.setAttribute('data-tm-location', cta.locationId);
            } else {
                ctaBtn.removeAttribute('data-tm-location');
            }
            if (cta.groupType) {
                ctaBtn.setAttribute('data-tm-group-type', cta.groupType);
            } else {
                ctaBtn.removeAttribute('data-tm-group-type');
            }
            ctaBtn.setAttribute('aria-disabled', 'true');
            if (ctaBtn.classList) ctaBtn.classList.add('is-disabled');
            return;
        }

        ctaBtn.removeAttribute('aria-disabled');
        if (ctaBtn.classList) ctaBtn.classList.remove('is-disabled');
        ctaBtn.href = cta.href || '#';
        syncExternalLinkAttrs(ctaBtn, cta);
        if (cta.externalLocation) {
            ctaBtn.removeAttribute('data-tm-booking-url');
        } else if (cta.trigger) {
            ctaBtn.setAttribute('data-tm-booking-url', cta.bookingUrl);
        } else {
            ctaBtn.removeAttribute('data-tm-booking-url');
        }
        ctaBtn.setAttribute('data-tm-booking-kind', cta.kind);
        if (cta.locationId) {
            ctaBtn.setAttribute('data-tm-location', cta.locationId);
        } else {
            ctaBtn.removeAttribute('data-tm-location');
        }
        if (cta.groupType) {
            ctaBtn.setAttribute('data-tm-group-type', cta.groupType);
        } else {
            ctaBtn.removeAttribute('data-tm-group-type');
        }
    }

    var mountedPanel = null;

    function setBriqPanelMode(enabled) {
        NavigationAdapters.setBriqPanelMode(enabled);
    }

    function hideBriqWidget(options) {
        NavigationAdapters.hideBriqWidget(options);
    }

    function executeResolvedAction(action, loc) {
        return NavigationAdapters.execute(action, loc);
    }

    function executeNavigationAction(action, loc, options) {
        var opts = options || {};
        if (opts.cleanBookParam) cleanBookParamFromCurrentUrl();

        if (action.type === 'panel' || action.provider === 'panel') {
            return false;
        }
        if (action.deferred) {
            function doDeferredNav() {
                setTimeout(function () {
                    executeResolvedAction(action, loc);
                }, 300);
            }
            if (document.readyState === 'complete') {
                doDeferredNav();
            } else {
                window.addEventListener('load', doDeferredNav);
            }
            return true;
        }

        return executeResolvedAction(action, loc);
    }

    function navigate(intent) {
        var opts = intent || {};
        var href = opts.href;
        if (!href && opts.currentTarget && typeof opts.currentTarget.getAttribute === 'function') {
            href = BookingJourney.getBookingHref(opts.currentTarget);
        }
        if (!href || href === '#') {
            if (typeof opts.openPanel === 'function') {
                if (opts.event && typeof opts.event.preventDefault === 'function') opts.event.preventDefault();
                opts.openPanel(opts.event);
            }
            return false;
        }

        var targetLocationId = opts.locationId
            || (opts.currentTarget && typeof opts.currentTarget.getAttribute === 'function' && opts.currentTarget.getAttribute('data-tm-location'))
            || '';
        var targetPageLocationSlug = opts.pageLocationSlug || (document.body && document.body.dataset.location) || '';
        var outcome = BookingJourney.resolveOutcome({
            href: href,
            kind: opts.kind,
            groupType: opts.groupType || opts.pageGroupType || '',
            locationId: targetLocationId,
            pageLocationSlug: targetPageLocationSlug,
            location: locationForOptions({
                locationId: targetLocationId,
                pageLocationSlug: targetPageLocationSlug,
            }),
            currentTarget: opts.currentTarget || null,
            resolveHref: false,
        }, {
            deferUntilLoad: !!opts.deferUntilLoad,
        });
        var resolvedIntent = outcome.intent;
        var loc = resolvedIntent.location;
        var kind = resolvedIntent.kind;
        href = resolvedIntent.href;
        var source = String(opts.source || 'generic_cta');
        var locationSlug = resolvedIntent.locationSlug;
        var ctaId = opts.ctaId
            || (opts.currentTarget && opts.currentTarget.className && String(opts.currentTarget.className).split(' ')[0])
            || source;

        if (opts.event && typeof opts.event.preventDefault === 'function') opts.event.preventDefault();

        tmTrack('booking_click', {
            cta_id: ctaId,
            destination_url: safeDestination(href).split('?')[0],
            location_slug: locationSlug,
        });

        var action = outcome.action;

        if (action.trackCheckout) {
            tmTrack('checkout_start', {
                destination_url: safeDestination(href),
                location_slug: locationSlug,
                cta_id: source,
            });
        }

        return executeNavigationAction(action, loc, {
            cleanBookParam: !!opts.cleanBookParam,
        });
    }

    function attach(root, options) {
        var opts = options || {};
        if (!root) return function () {};
        var selector = opts.selector || '[data-tm-booking-trigger]';
        var openPanel = typeof opts.openPanel === 'function' ? opts.openPanel : null;
        var setPanelIntent = typeof opts.setPanelIntent === 'function' ? opts.setPanelIntent : null;
        var pageLocationSlug = opts.pageLocationSlug || '';
        var handler = typeof opts.handler === 'function' ? opts.handler : function (event) {
            var btn = event.currentTarget;
            var href = BookingJourney.getBookingHref(btn);
            var hasInitialHref = BookingJourney.isNavigableHref(href);
            var intent = resolveBookingIntent({
                href: href,
                currentTarget: btn,
                pageLocationSlug: pageLocationSlug,
                resolveHref: false,
            });
            var kind = intent.kind;
            var groupType = intent.groupType;
            var locationId = intent.locationId;
            var loc = intent.location;

            if (BookingJourney.isTicketKind(kind) && !loc && openPanel) {
                event.preventDefault();
                if (setPanelIntent) setPanelIntent({ kind: kind, groupType: groupType });
                openPanel(event);
                return;
            }

            if (BookingJourney.isTicketKind(kind) || !hasInitialHref) {
                intent = resolveBookingIntent({
                    href: href,
                    kind: kind,
                    groupType: groupType,
                    locationId: locationId,
                    pageLocationSlug: pageLocationSlug,
                    preferLocationPageFlow: false,
                    resolveHref: true,
                });
                loc = intent.location;
                if (intent.href) href = intent.href;
                hasInitialHref = BookingJourney.isNavigableHref(href);
            }

            if (hasInitialHref || (kind !== 'tickets' && BookingJourney.isNavigableHref(href))) {
                navigate({
                    source: 'direct_booking',
                    href: href,
                    kind: kind,
                    groupType: groupType,
                    locationId: locationId,
                    pageLocationSlug: pageLocationSlug,
                    currentTarget: btn,
                    event: event,
                });
                return;
            }
            if (openPanel) {
                event.preventDefault();
                if (setPanelIntent) setPanelIntent({ kind: kind, groupType: groupType });
                openPanel(event);
            }
        };

        if (typeof root.addEventListener === 'function') {
            var delegatedHandler = function (event) {
                var target = event.target && event.target.closest ? event.target.closest(selector) : null;
                if (!target) return;
                if (root !== document && typeof root.contains === 'function' && !root.contains(target)) return;
                handler({
                    currentTarget: target,
                    target: event.target,
                    button: event.button,
                    metaKey: event.metaKey,
                    ctrlKey: event.ctrlKey,
                    shiftKey: event.shiftKey,
                    altKey: event.altKey,
                    defaultPrevented: event.defaultPrevented,
                    preventDefault: function () { event.preventDefault(); },
                    stopPropagation: function () { event.stopPropagation(); },
                });
            };
            root.addEventListener('click', delegatedHandler);
            return function detach() {
                root.removeEventListener('click', delegatedHandler);
            };
        }

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

    function open(opts) {
        var detail = opts || {};
        if (mountedPanel) {
            mountedPanel.openPanel(detail);
            return;
        }
        document.dispatchEvent(new CustomEvent('tm:booking:open', { detail: detail }));
    }

    function mount(panelEl, opts) {
        var options = opts || {};
        var panel       = panelEl                || document.getElementById('ticketPanel');
        var locSelect   = options.selectEl       || document.getElementById('ticketLocation');
        var ctaBtn      = options.ctaEl          || document.getElementById('ticketBookBtn');
        var openPanel   = typeof options.openPanel === 'function' ? options.openPanel : null;
        var closePanel  = typeof options.closePanel === 'function' ? options.closePanel : null;
        var pageLocationSlug = BookingJourney.normalizeLocation(options.pageLocationSlug || (document.body && document.body.dataset.location) || '');
        var panelIntent = { kind: 'tickets', groupType: '' };

        if (locSelect && locSelect.options && pageLocationSlug) {
            for (var i = 0; i < locSelect.options.length; i++) {
                if (BookingJourney.normalizeLocation(locSelect.options[i].value) === pageLocationSlug) {
                    locSelect.value = locSelect.options[i].value;
                    break;
                }
            }
        }

        function selectedLocation() {
            return locationForOptions({
                locationId: locSelect ? locSelect.value : '',
                pageLocationSlug: pageLocationSlug,
            });
        }

        function syncPanelCopy(loc, intent) {
            if (!panel) return;
            var title = panel.querySelector('#ticketPanelTitle');
            var intro = panel.querySelector('#ticketPanelIntro');
            var ctaText = panel.querySelector('#ticketBookBtnText');
            var copy = panelCopyForIntent(loc, intent || panelIntent);
            if (title) title.textContent = copy.title;
            if (intro) intro.textContent = copy.intro;
            if (ctaText) ctaText.textContent = copy.cta;
        }

        function setPanelIntent(intent, options) {
            var next = intent || {};
            panelIntent = {
                kind: BookingJourney.normalizeKind(next.kind || 'tickets'),
                groupType: BookingJourney.normalizeGroupType(next.groupType || next.pageGroupType || ''),
            };
            if (!options || !options.skipSync) syncCtaHref();
        }

        mountedPanel = {
            panelEl: panel,
            openPanel: function (detail) {
                var isBriqPanel = !!(detail && detail.briqPanel);
                setPanelIntent(detail, { skipSync: isBriqPanel });
                if (isBriqPanel) setBriqPanelMode(true);
                if (openPanel) openPanel(detail);
                if (!isBriqPanel) syncCtaHref();
            },
            closePanel: closePanel,
            setPanelIntent: setPanelIntent,
        };
        NavigationAdapters.configure({
            getPanelEl: function () {
                return mountedPanel && mountedPanel.panelEl
                    ? mountedPanel.panelEl
                    : document.getElementById('ticketPanel');
            },
        });
        if (window.TMBookingBriq && typeof window.TMBookingBriq.setPanelAdapter === 'function') {
            window.TMBookingBriq.setPanelAdapter({
                getPanelEl: function () { return panel; },
                openPanel: mountedPanel.openPanel,
                closePanel: closePanel,
                setPanelMode: setBriqPanelMode,
            });
        }

        if (ctaBtn) {
            ctaBtn.setAttribute('data-tm-booking-trigger', '');
            ctaBtn.removeAttribute('target');
            ctaBtn.removeAttribute('rel');
        }

        function syncCtaHref() {
            if (!ctaBtn || !locSelect) return;
            var loc = selectedLocation();
            if (!loc) {
                hideBriqWidget();
                syncPanelCopy(loc);
                syncCtaElementToIntent(ctaBtn, {
                    kind: panelIntent.kind,
                    groupType: panelIntent.groupType,
                    location: null,
                });
                return;
            }
            hideBriqWidget();
            if (!locSelect.value && (loc.id || loc.slug)) {
                locSelect.value = loc.id || loc.slug;
            }
            var intent = resolveBookingIntent({
                kind: panelIntent.kind,
                groupType: panelIntent.groupType,
                locationId: locSelect.value,
                pageLocationSlug: pageLocationSlug,
                preferLocationPageFlow: false,
                resolveHref: true,
            });
            syncPanelCopy(loc, intent);
            syncCtaElementToIntent(ctaBtn, intent);
        }

        function redirectExternalTicketSelection() {
            if (!locSelect || panelIntent.kind !== 'tickets') return false;
            var loc = selectedLocation();
            if (!loc || !BookingJourney.getExternalLocationUrl(loc)) return false;
            var intent = resolveBookingIntent({
                kind: panelIntent.kind,
                groupType: panelIntent.groupType,
                locationId: locSelect.value,
                pageLocationSlug: pageLocationSlug,
                preferLocationPageFlow: false,
                resolveHref: true,
            });
            navigate({
                source: 'ticket_panel_external_location',
                ctaId: 'ticket_panel_external_location',
                href: intent.href,
                kind: intent.kind,
                groupType: intent.groupType,
                locationId: locSelect.value,
                pageLocationSlug: pageLocationSlug,
            });
            return true;
        }

        if (locSelect) {
            locSelect.addEventListener('change', function () {
                selectSiteLocation(locSelect.value, 'ticket_panel_dropdown');
                if (redirectExternalTicketSelection()) return;
                syncCtaHref();
            });
        }

        document.addEventListener('tm:language-changed', syncCtaHref);

        var ctx = (window.LocationContext || (window.TM && { ready: window.TM.ready })) || null;
        if (ctx && ctx.ready && typeof ctx.ready.then === 'function') {
            ctx.ready.then(syncCtaHref);
        } else {
            syncCtaHref();
        }

        attach(document, {
            selector: '[data-tm-booking-trigger]',
            pageLocationSlug: pageLocationSlug,
            openPanel: openPanel,
            setPanelIntent: setPanelIntent,
        });

        return { syncCtaHref: syncCtaHref };
    }

    function scheduleAutoRedirect() {
        var pageLocationSlug = BookingJourney.normalizeLocation((document.body && document.body.dataset.location) || '');
        if (!pageLocationSlug) return;
        if (window.location.search.indexOf('book=1') === -1) return;

        function doRedirect() {
            var loc = getLocation(pageLocationSlug);
            if (BookingJourney.isTemporarilyClosedLocation(loc)) {
                cleanBookParamFromCurrentUrl();
                document.dispatchEvent(new CustomEvent('tm:location-closure:open', { detail: { location: loc } }));
                return;
            }
            var href = getDestination({
                kind: 'tickets',
                locationId: pageLocationSlug,
                pageLocationSlug: pageLocationSlug,
                preferLocationPageFlow: false,
            });
            if (!href) return;
            navigate({
                source: 'book_param_auto',
                ctaId: 'book_param_auto',
                href: href,
                locationId: pageLocationSlug,
                pageLocationSlug: pageLocationSlug,
                cleanBookParam: true,
                deferUntilLoad: true,
            });
        }

        function awaitTMReady(deadline) {
            if (window.TM && window.TM.ready && typeof window.TM.ready.then === 'function') {
                window.TM.ready.then(doRedirect);
                return;
            }
            if (Date.now() > deadline) {
                doRedirect();
                return;
            }
            setTimeout(function () { awaitTMReady(deadline); }, 25);
        }
        awaitTMReady(Date.now() + 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleAutoRedirect);
    } else {
        scheduleAutoRedirect();
    }

    window.BookingController = {
        attach: attach,
        isDirectBookingUrl: isDirectBookingUrl
    };
    window.TMBooking = {
        attach: attach,
        getDestination: getDestination,
        resolveLocationDestination: BookingJourney.resolveLocationDestination,
        resolveIntent: resolveBookingIntent,
        navigate: navigate,
        isDirectBookingUrl: isDirectBookingUrl,
        open: open,
        closeBriqWidget: hideBriqWidget,
        resolve: resolve,
        mount: mount,
    };

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
