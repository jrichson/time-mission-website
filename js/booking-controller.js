// ==========================================
// BOOKING CONTROLLER
// Single canonical booking gateway (RFC-10).
// All booking URL math, analytics tracking, panel mount, and the ?book=1
// auto-redirect live here on window.TMBooking.
// ==========================================
(function () {
    'use strict';

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

    function normalizeLocation(value) {
        return (value || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

    function normalizeGroupType(value) {
        return normalizeLocation(value).replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    function normalizeKind(value) {
        return normalizeLocation(value || 'tickets');
    }

    function isDirectBookingUrl(href) {
        if (!href || href === '#') return false;
        return /^(https?:|mailto:|tel:)/i.test(href);
    }

    function isNavigableHref(href) {
        var value = String(href || '').trim();
        return !!value && value !== '#' && !/^javascript:/i.test(value);
    }

    function getBookingHref(btn) {
        if (!btn || typeof btn.getAttribute !== 'function') return '';
        return btn.getAttribute('data-tm-booking-url') || btn.getAttribute('href') || '';
    }

    function isExternalHttpUrl(href) {
        return /^https?:\/\//i.test(String(href || '').trim());
    }

    function isTicketKind(kind) {
        return normalizeKind(kind) === 'tickets';
    }

    function shouldUseBookingFrame(kind, href) {
        var normalizedKind = normalizeKind(kind);
        return isExternalHttpUrl(href) && (normalizedKind === 'tickets' || normalizedKind === 'groups');
    }

    function locationForOptions(opts) {
        opts = opts || {};
        var locationId = normalizeLocation(opts.locationId || '');
        var pageLocationSlug = normalizeLocation(opts.pageLocationSlug || '');
        return getLocation(locationId) || getLocation(pageLocationSlug) || getLocation(null);
    }

    function resolveOpenCheckoutUrl(loc) {
        if (!loc) return '';
        var roller = (loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        if (roller !== '') return roller;
        var booking = (loc.bookingUrl && String(loc.bookingUrl).trim()) || '';
        return booking;
    }

    function getExternalLocationUrl(loc) {
        return (loc && loc.externalUrl && String(loc.externalUrl).trim()) || '';
    }

    function isLocationExternalSiteUrl(loc, href) {
        var externalUrl = getExternalLocationUrl(loc);
        return !!externalUrl && String(href || '').trim() === externalUrl;
    }

    function isBookableLocation(loc) {
        return !!resolveOpenCheckoutUrl(loc);
    }

    function isLeadOnlyComingSoon(loc) {
        return !!(loc && loc.status === 'coming-soon' && !isBookableLocation(loc));
    }

    function resolveComingSoonLeadUrl(loc, fallbackSlug) {
        var slug = (loc && (loc.slug || loc.id)) || fallbackSlug || '';
        return slug ? '/' + slug + '#newsletter' : '/locations#newsletter';
    }

    function resolveLocationDestination(loc, options) {
        var opts = options || {};
        if (!loc) return '';
        var kind = normalizeKind(opts.kind || 'tickets');
        var slug = loc.slug || loc.id || normalizeLocation(opts.locationId || opts.pageLocationSlug || '');
        var externalUrl = getExternalLocationUrl(loc);
        if (externalUrl) return externalUrl;

        var checkoutUrl = resolveOpenCheckoutUrl(loc);
        var bookable = !!checkoutUrl;

        if (kind === 'gift-cards' || kind === 'giftcards') {
            if (loc.giftCardUrl) return loc.giftCardUrl;
            if (loc.status === 'coming-soon') return resolveComingSoonLeadUrl(loc, slug);
            return loc.giftCardUrl || '';
        }

        if (kind === 'waiver' || kind === 'waivers') {
            if (loc.waiverUrl) return loc.waiverUrl;
            if (loc.status === 'coming-soon') return resolveComingSoonLeadUrl(loc, slug);
            return loc.waiverUrl || '';
        }

        if (kind === 'groups') {
            var groupType = normalizeGroupType(opts.groupType || opts.pageGroupType || '');
            var groupUrls = loc.groupFormUrls || {};
            var groupUrl = (groupType && groupUrls[groupType]) || groupUrls.default || loc.groupsUrl || '';
            if (groupUrl) return groupUrl;
            if (bookable) return checkoutUrl;
            if (loc.status === 'coming-soon') return resolveComingSoonLeadUrl(loc, slug);
            return '';
        }

        if (opts.preferLocationPageFlow && slug) {
            return '/' + slug + '?book=1';
        }

        if (bookable) return checkoutUrl;
        if (loc.status === 'coming-soon') return resolveComingSoonLeadUrl(loc, slug);
        return '';
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

    /** RFC-10: canonical resolver alias. Thin wrapper over getDestination. */
    function resolve(opts) {
        return getDestination(opts);
    }

    function bookingPresentationFor(loc, kind, href) {
        if (!isNavigableHref(href)) return 'panel';
        if (isLocationExternalSiteUrl(loc, href)) return 'external-site';
        if (isTicketKind(kind) && shouldUseRollerCheckout(loc, href, kind)) return 'roller';
        if (shouldUseBookingFrame(kind, href)) return 'iframe';
        return 'link';
    }

    function resolveBookingIntent(options) {
        var opts = options || {};
        var currentTarget = opts.currentTarget || null;
        var kind = normalizeKind(
            opts.kind
            || (currentTarget && currentTarget.getAttribute('data-tm-booking-kind'))
            || 'tickets'
        );
        var groupType = normalizeGroupType(
            opts.groupType
            || opts.pageGroupType
            || (currentTarget && (currentTarget.getAttribute('data-tm-group-type') || currentTarget.getAttribute('data-tm-page-group')))
            || ''
        );
        var locationId = normalizeLocation(
            opts.locationId
            || (currentTarget && currentTarget.getAttribute('data-tm-location'))
            || ''
        );
        var pageLocationSlug = normalizeLocation(opts.pageLocationSlug || '');
        var loc = locationForOptions({
            locationId: locationId,
            pageLocationSlug: pageLocationSlug,
        });
        var href = String(opts.href || '').trim();
        if (!href && currentTarget) href = getBookingHref(currentTarget);

        if (loc && opts.resolveHref !== false && (isTicketKind(kind) || !isNavigableHref(href))) {
            var resolvedHref = resolveLocationDestination(loc, {
                kind: kind,
                groupType: groupType,
                locationId: locationId,
                pageLocationSlug: pageLocationSlug,
                preferLocationPageFlow: !!opts.preferLocationPageFlow,
            });
            if (resolvedHref) href = resolvedHref;
        }

        var locationSlug = normalizeLocation(
            locationId
            || pageLocationSlug
            || (loc && (loc.id || loc.slug))
            || ''
        );
        var presentation = bookingPresentationFor(loc, kind, href);
        return {
            kind: kind,
            groupType: groupType,
            locationId: locationId,
            pageLocationSlug: pageLocationSlug,
            location: loc,
            locationSlug: locationSlug,
            href: href,
            hasHref: isNavigableHref(href),
            presentation: presentation,
            usesBookingFrame: presentation === 'iframe',
            usesRollerCheckout: presentation === 'roller',
            externalLocationSite: presentation === 'external-site',
        };
    }

    function panelCopyForIntent(loc, intent) {
        var kind = normalizeKind((intent && intent.kind) || 'tickets');
        if (!loc) {
            return {
                title: 'Choose Your Location',
                intro: 'Select a location and we will show the right booking option.',
                cta: 'Select Location First',
            };
        }
        if (getExternalLocationUrl(loc)) {
            return {
                title: 'Time Mission Europe',
                intro: 'Continue to the EU-hosted site for this location.',
                cta: 'Visit EU Site',
            };
        }
        if ((kind === 'tickets' || kind === 'groups') && isLeadOnlyComingSoon(loc)) {
            return {
                title: 'Get Location Updates',
                intro: 'Select a coming-soon location and sign up for launch news, early access, and opening offers.',
                cta: 'Sign Up for Updates',
            };
        }
        if (kind === 'groups') {
            return {
                title: 'Plan Your Event',
                intro: 'Select your location and we will send you to the right event request form.',
                cta: 'Continue to Form',
            };
        }
        if (kind === 'waiver' || kind === 'waivers') {
            return {
                title: 'Complete Your Waiver',
                intro: 'Select your location and we will send you to the correct waiver provider when one is available.',
                cta: 'Continue to Waiver',
            };
        }
        return {
            title: 'Book Your Adventure',
            intro: "Select your location and we'll take you to our booking system to choose your date and time.",
            cta: 'Continue to Booking',
        };
    }

    function syncCtaElementToIntent(ctaBtn, intent) {
        if (!ctaBtn) return;
        if (!intent || !intent.location) {
            ctaBtn.href = '#';
            ctaBtn.removeAttribute('data-tm-booking-url');
            ctaBtn.removeAttribute('data-tm-location');
            ctaBtn.removeAttribute('data-tm-group-type');
            ctaBtn.setAttribute('data-tm-booking-kind', intent ? intent.kind : 'tickets');
            ctaBtn.setAttribute('aria-disabled', 'true');
            if (ctaBtn.classList) ctaBtn.classList.add('is-disabled');
            return;
        }

        ctaBtn.removeAttribute('aria-disabled');
        if (ctaBtn.classList) ctaBtn.classList.remove('is-disabled');
        if (intent.externalLocationSite) {
            ctaBtn.href = intent.href;
            ctaBtn.removeAttribute('data-tm-booking-url');
        } else if (intent.usesBookingFrame || intent.usesRollerCheckout) {
            ctaBtn.href = '#';
            ctaBtn.setAttribute('data-tm-booking-url', intent.href);
        } else {
            ctaBtn.href = intent.href || '#';
            ctaBtn.removeAttribute('data-tm-booking-url');
        }
        ctaBtn.setAttribute('data-tm-booking-kind', intent.kind);
        if (intent.location && (intent.location.id || intent.location.slug)) {
            ctaBtn.setAttribute('data-tm-location', intent.location.id || intent.location.slug);
        } else {
            ctaBtn.removeAttribute('data-tm-location');
        }
        if (intent.groupType) {
            ctaBtn.setAttribute('data-tm-group-type', intent.groupType);
        } else {
            ctaBtn.removeAttribute('data-tm-group-type');
        }
    }

    function shouldUseRollerCheckout(loc, href, kind) {
        if (!loc || normalizeKind(kind) !== 'tickets') return false;
        var roller = (loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        return !!roller && href === roller;
    }

    function shouldUseBriqWidget(loc, kind) {
        var bookingKind = normalizeKind(kind);
        return !!(loc && (loc.briqWidget || loc.briqWidgetDomain) && (bookingKind === 'tickets' || bookingKind === 'groups'));
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

    function loadBriqWidgetScript() {
        if (document.getElementById('briq-widget-script')) return;
        var script = document.createElement('script');
        script.id = 'briq-widget-script';
        script.src = 'https://widgetcdn.briqbookings.com/widget/widget.js';
        script.async = true;
        document.head.appendChild(script);
    }

    var bookingFrame = null;

    function closeBookingFrame() {
        if (!bookingFrame) return;
        bookingFrame.overlay.classList.remove('active');
        bookingFrame.overlay.hidden = true;
        bookingFrame.iframe.src = 'about:blank';
        document.body.style.overflow = '';
    }

    function ensureBookingFrame() {
        if (bookingFrame) return bookingFrame;

        var overlay = document.createElement('div');
        overlay.className = 'booking-frame-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'bookingFrameTitle');
        overlay.hidden = true;

        var modal = document.createElement('div');
        modal.className = 'booking-frame-modal';

        var header = document.createElement('div');
        header.className = 'booking-frame-header';

        var title = document.createElement('h3');
        title.id = 'bookingFrameTitle';
        title.textContent = 'Complete Your Booking';

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'booking-frame-close';
        close.setAttribute('aria-label', 'Close booking');
        close.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

        var iframe = document.createElement('iframe');
        iframe.className = 'booking-frame';
        iframe.title = 'Time Mission booking';
        iframe.loading = 'eager';
        iframe.referrerPolicy = 'no-referrer-when-downgrade';
        iframe.setAttribute('allow', 'payment *; fullscreen');

        header.appendChild(title);
        header.appendChild(close);
        modal.appendChild(header);
        modal.appendChild(iframe);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) closeBookingFrame();
        });
        close.addEventListener('click', closeBookingFrame);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !overlay.hidden) closeBookingFrame();
        });

        bookingFrame = {
            overlay: overlay,
            title: title,
            close: close,
            iframe: iframe,
        };
        return bookingFrame;
    }

    function showBookingFrame(loc, href) {
        if (!isExternalHttpUrl(href)) return false;
        var frame = ensureBookingFrame();
        var name = (loc && (loc.shortName || loc.name)) || 'Time Mission';
        frame.title.textContent = 'Book ' + name;
        frame.iframe.src = href;
        frame.overlay.hidden = false;
        frame.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        try {
            frame.close.focus({ preventScroll: true });
        } catch (e) {
            frame.close.focus();
        }
        return true;
    }

    function navigate(intent) {
        var opts = intent || {};
        var href = opts.href;
        if (!href && opts.currentTarget && typeof opts.currentTarget.getAttribute === 'function') {
            href = getBookingHref(opts.currentTarget);
        }
        if (!href || href === '#') {
            if (typeof opts.openPanel === 'function') {
                if (opts.event && typeof opts.event.preventDefault === 'function') opts.event.preventDefault();
                opts.openPanel(opts.event);
            }
            return false;
        }

        var resolvedIntent = resolveBookingIntent({
            href: href,
            kind: opts.kind,
            groupType: opts.groupType || opts.pageGroupType || '',
            locationId: opts.locationId || '',
            pageLocationSlug: opts.pageLocationSlug || '',
            currentTarget: opts.currentTarget || null,
            resolveHref: false,
        });
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

        if (/^https?:\/\//i.test(href)) {
            tmTrack('checkout_start', {
                destination_url: safeDestination(href),
                location_slug: locationSlug,
                cta_id: source,
            });
        }

        if (opts.cleanBookParam && history.replaceState) {
            history.replaceState(null, '', window.location.pathname);
        }

        if (resolvedIntent.externalLocationSite) {
            window.location.assign(href);
            return true;
        }

        if (!opts.deferUntilLoad && resolvedIntent.usesRollerCheckout) {
            showRollerCheckout(loc, function () {
                showBookingFrame(loc, href);
            });
            return true;
        }

        if (!opts.deferUntilLoad && resolvedIntent.usesBookingFrame) {
            showBookingFrame(loc, href);
            return true;
        }

        if (opts.deferUntilLoad) {
            function doDeferredNav() {
                setTimeout(function () {
                    if (resolvedIntent.externalLocationSite) {
                        window.location.assign(href);
                    } else if (resolvedIntent.usesRollerCheckout) {
                        showRollerCheckout(loc, function () {
                            showBookingFrame(loc, href);
                        });
                    } else if (resolvedIntent.usesBookingFrame) {
                        showBookingFrame(loc, href);
                    } else {
                        window.location.href = href;
                    }
                }, 300);
            }
            // TM.ready often resolves after fetch — after window "load" already fired.
            // Listening for "load" alone never runs in that case (BOOK-04 / ?book=1 auto-redirect).
            if (document.readyState === 'complete') {
                doDeferredNav();
            } else {
                window.addEventListener('load', doDeferredNav);
            }
            return true;
        }

        window.location.assign(href);
        return true;
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
            var href = getBookingHref(btn);
            var hasInitialHref = isNavigableHref(href);
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

            if (isTicketKind(kind) && !loc && openPanel) {
                event.preventDefault();
                if (setPanelIntent) setPanelIntent({ kind: kind, groupType: groupType });
                openPanel(event);
                return;
            }

            if (isTicketKind(kind) || !hasInitialHref) {
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
                hasInitialHref = isNavigableHref(href);
            }

            if (isTicketKind(kind) && shouldUseBriqWidget(loc, kind) && openPanel) {
                event.preventDefault();
                if (setPanelIntent) setPanelIntent({ kind: kind, groupType: groupType });
                openPanel(event);
                return;
            }

            if (hasInitialHref || (kind !== 'tickets' && isNavigableHref(href))) {
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

    // -----------------------------------------------------------------
    // RFC-10: Panel mount + open + auto-redirect (centralized in TMBooking)
    // -----------------------------------------------------------------

    var mountedPanel = null;

    /**
     * Programmatic ticket-panel open. Looks for a registered panel mount; if
     * none, dispatches a CustomEvent('tm:booking:open') so panel impls can
     * listen and open without TMBooking importing UI code.
     */
    function open(opts) {
        var detail = opts || {};
        if (mountedPanel && typeof mountedPanel.openPanel === 'function') {
            mountedPanel.openPanel(detail);
            return;
        }
        document.dispatchEvent(new CustomEvent('tm:booking:open', { detail: detail }));
    }

    /**
     * Wire a panel DOM (selectEl, ctaBtn, etc.) to TMBooking handlers.
     * panelEl optional — auto-discovers via #ticketPanel/#ticketLocation/#ticketBookBtn
     * if absent. Returns a small handle for callers (mainly { syncCtaHref }).
     */
    function mount(panelEl, opts) {
        var options = opts || {};
        var panel       = panelEl                || document.getElementById('ticketPanel');
        var locSelect   = options.selectEl       || document.getElementById('ticketLocation');
        var ctaBtn      = options.ctaEl          || document.getElementById('ticketBookBtn');
        var widgetEl    = options.widgetEl       || document.getElementById('ticketProviderWidget');
        var openPanel   = typeof options.openPanel === 'function' ? options.openPanel : null;
        var closePanel  = typeof options.closePanel === 'function' ? options.closePanel : null;
        var pageLocationSlug = normalizeLocation(options.pageLocationSlug || (document.body && document.body.dataset.location) || '');
        var panelIntent = { kind: 'tickets', groupType: '' };

        if (locSelect && locSelect.options && pageLocationSlug) {
            for (var i = 0; i < locSelect.options.length; i++) {
                if (normalizeLocation(locSelect.options[i].value) === pageLocationSlug) {
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

        function syncPanelCopy(loc) {
            if (!panel) return;
            var title = panel.querySelector('#ticketPanelTitle');
            var intro = panel.querySelector('#ticketPanelIntro');
            var ctaText = panel.querySelector('#ticketBookBtnText');
            var copy = panelCopyForIntent(loc, panelIntent);
            if (title) title.textContent = copy.title;
            if (intro) intro.textContent = copy.intro;
            if (ctaText) ctaText.textContent = copy.cta;
        }

        function setPanelIntent(intent) {
            var next = intent || {};
            panelIntent = {
                kind: normalizeKind(next.kind || 'tickets'),
                groupType: normalizeGroupType(next.groupType || next.pageGroupType || ''),
            };
            syncCtaHref();
        }

        mountedPanel = {
            panelEl: panel,
            openPanel: function (detail) {
                setPanelIntent(detail);
                if (openPanel) openPanel(detail);
                syncCtaHref();
            },
            closePanel: closePanel,
            setPanelIntent: setPanelIntent,
        };

        // Mark CTA button as a booking trigger so attach() owns its click.
        if (ctaBtn) {
            ctaBtn.setAttribute('data-tm-booking-trigger', '');
            ctaBtn.removeAttribute('target');
            ctaBtn.removeAttribute('rel');
        }

        function renderBriqWidget(loc) {
            if (!widgetEl) return;
            widgetEl.textContent = '';
            widgetEl.hidden = true;
            if (ctaBtn) ctaBtn.hidden = false;
            if (!shouldUseBriqWidget(loc, panelIntent.kind)) return;

            var config = loc.briqWidget || {};
            var domain = config.domain || loc.briqWidgetDomain;
            if (!domain) return;
            var widget = document.createElement('div');
            widget.id = 'briq-widget';
            widget.className = 'bw-widget';
            widget.setAttribute('data-domain', domain);
            widget.setAttribute('data-color-1-base', config.color1Base || '#FFBA00');
            widget.setAttribute('data-color-1-contrast', config.color1Contrast || '#010437');
            widget.setAttribute('data-color-2-base', config.color2Base || '#FFBA00');
            widget.setAttribute('data-color-2-contrast', config.color2Contrast || '#010437');
            widget.setAttribute('data-price-display', config.priceDisplay || 'PerPerson');
            widget.setAttribute('data-button-text', config.buttonText || 'BOOK NOW');
            widgetEl.appendChild(widget);
            widgetEl.hidden = false;
            if (ctaBtn) ctaBtn.hidden = true;
            loadBriqWidgetScript();
        }

        // Keep the CTA button's href in sync with the dropdown selection.
        function syncCtaHref() {
            if (!ctaBtn || !locSelect) return;
            var loc = selectedLocation();
            syncPanelCopy(loc);
            if (!loc) {
                syncCtaElementToIntent(ctaBtn, {
                    kind: panelIntent.kind,
                    groupType: panelIntent.groupType,
                    location: null,
                });
                renderBriqWidget(null);
                return;
            }
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
            syncCtaElementToIntent(ctaBtn, intent);
            renderBriqWidget(loc);
        }

        if (locSelect) {
            locSelect.addEventListener('change', function () {
                syncCtaHref();
                tmTrack('location_select', {
                    location_slug: locSelect.value,
                    cta_id: 'ticket_panel_dropdown',
                });
            });
        }

        // Defer the initial sync until TM data is hydrated.
        var ctx = (window.LocationContext || (window.TM && { ready: window.TM.ready })) || null;
        if (ctx && ctx.ready && typeof ctx.ready.then === 'function') {
            ctx.ready.then(syncCtaHref);
        } else {
            syncCtaHref();
        }

        // attach() binds [data-tm-booking-trigger] click delegation, so the CTA
        // button now flows through navigate() automatically. Don't add a second handler.
        attach(document, {
            selector: '[data-tm-booking-trigger]',
            pageLocationSlug: pageLocationSlug,
            openPanel: openPanel,
            setPanelIntent: setPanelIntent,
        });

        return { syncCtaHref: syncCtaHref };
    }

    /**
     * RFC-10 fix for BOOK-04 race: ?book=1 auto-redirect on a location page
     * deterministically waits for window.TM.ready before navigating. The
     * previous implementation in ticket-panel.js had a synchronous else-branch
     * fallthrough that could fire before TM hydration completed.
     */
    function scheduleAutoRedirect() {
        var pageLocationSlug = normalizeLocation((document.body && document.body.dataset.location) || '');
        if (!pageLocationSlug) return;
        if (window.location.search.indexOf('book=1') === -1) return;

        function doRedirect() {
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
                cleanBookParam: true,
                deferUntilLoad: true,
            });
        }

        // Always wait for TM.ready. Never fall through synchronously even if
        // window.TM is not yet defined when this script runs. Poll briefly
        // (≤1s) for TM.ready, then resolve. Closes the BOOK-04 race where the
        // else branch fired before location data hydrated.
        function awaitTMReady(deadline) {
            if (window.TM && window.TM.ready && typeof window.TM.ready.then === 'function') {
                window.TM.ready.then(doRedirect);
                return;
            }
            if (Date.now() > deadline) {
                // Last resort after 1s: TM script never loaded. Better to navigate
                // to /slug than leave the user stranded on /slug?book=1 forever.
                doRedirect();
                return;
            }
            setTimeout(function () { awaitTMReady(deadline); }, 25);
        }
        awaitTMReady(Date.now() + 1000);
    }

    // Auto-boot on script load (defer is set on the <script>, so DOM is ready).
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleAutoRedirect);
    } else {
        scheduleAutoRedirect();
    }

    // -----------------------------------------------------------------
    // Public surface
    // -----------------------------------------------------------------

    window.BookingController = {
        attach: attach,
        isDirectBookingUrl: isDirectBookingUrl
    };
    window.TMBooking = {
        attach: attach,
        getDestination: getDestination,
        resolveLocationDestination: resolveLocationDestination,
        resolveIntent: resolveBookingIntent,
        navigate: navigate,
        isDirectBookingUrl: isDirectBookingUrl,
        open: open,
        resolve: resolve,
        mount: mount,
    };

    /** Supported extension surface for new features (see docs/tm-public-api.md). */
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
