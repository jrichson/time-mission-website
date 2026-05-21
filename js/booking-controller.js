// ==========================================
// BOOKING CONTROLLER
// Booking gateway for URL resolution, analytics, the panel mount, and ?book=1.
// ==========================================
(function () {
    'use strict';

    var BookingJourney = window.TMBookingJourney;
    if (!BookingJourney) throw new Error('TMBookingJourney must load before booking-controller.js');

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

    var bookingFrame = null;
    var mountedPanel = null;
    var briqOpenRetryTimer = null;
    var briqCloseObserver = null;
    var briqFitRetryTimer = null;
    var briqResizeHandlerAttached = false;
    var BRIQ_WIDGET_SCRIPT_SRC = 'https://widgetcdn.briqbookings.com/widget/widget.js';
    var BRIQ_WIDGET_STYLE_HREF = '/css/briq-widget.css?v=2';

    function getBriqWidgetContainer() {
        return document.getElementById('briq-widget-container');
    }

    function getBriqWidget() {
        return document.getElementById('briq-widget');
    }

    function ensureBriqLoadingIndicator(container) {
        if (!container) return null;
        var loader = container.querySelector && container.querySelector('[data-briq-widget-loader]');
        if (loader) return loader;
        loader = document.createElement('div');
        loader.className = 'briq-widget-loader';
        loader.setAttribute('data-briq-widget-loader', '');
        loader.setAttribute('role', 'status');
        loader.setAttribute('aria-live', 'polite');
        loader.innerHTML = '<span class="briq-widget-spinner" aria-hidden="true"></span><span class="briq-widget-loader-title">Loading booking options</span>';
        container.insertBefore(loader, container.firstChild || null);
        return loader;
    }

    function setBriqLoadingState(container, isLoading) {
        if (!container || !container.classList) return;
        ensureBriqLoadingIndicator(container);
        container.classList.toggle('is-loading', !!isLoading);
        container.classList.toggle('is-ready', !isLoading);
        if (isLoading) {
            container.setAttribute('aria-busy', 'true');
        } else {
            container.removeAttribute('aria-busy');
        }
    }

    function getBriqWidgetMain() {
        var widget = getBriqWidget();
        if (!widget) return null;
        if (widget.shadowRoot && typeof widget.shadowRoot.querySelector === 'function') {
            return widget.shadowRoot.querySelector('.bw-widget-main');
        }
        if (typeof widget.querySelector === 'function') {
            return widget.querySelector('.bw-widget-main');
        }
        return null;
    }

    function getBriqOpenToggle() {
        return document.querySelector('[data-briq-open-toggle]');
    }

    function briqConfigForLocation(loc) {
        return (loc && loc.briqWidget && loc.briqWidget.domain) ? loc.briqWidget : null;
    }

    function ensureBriqStylesheet() {
        if (document.querySelector('link[data-briq-widget-style]')) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = BRIQ_WIDGET_STYLE_HREF;
        link.setAttribute('data-briq-widget-style', '');
        document.head.appendChild(link);
    }

    function configureBriqWidget(widget, config) {
        widget.id = 'briq-widget';
        widget.className = 'bw-widget';
        widget.setAttribute('data-domain', config.domain);
        widget.setAttribute('data-color-1-base', config.color1Base || '#FFBA00');
        widget.setAttribute('data-color-1-contrast', config.color1Contrast || '#010437');
        widget.setAttribute('data-color-2-base', config.color2Base || '#FFBA00');
        widget.setAttribute('data-color-2-contrast', config.color2Contrast || '#010437');
        widget.setAttribute('data-price-display', config.priceDisplay || 'PerPerson');
        widget.setAttribute('data-button-text', config.buttonText || 'BOOK NOW');
        widget.setAttribute('data-features', 'hideMainButton');
        widget.setAttribute('data-positioning', "[{'x-align':'right','x-offset':'0px','y-offset':'0px','z-index':'10000'}]");
    }

    function ensureBriqWidgetHost(loc) {
        var config = briqConfigForLocation(loc);
        if (!config) return null;

        ensureBriqStylesheet();

        var container = getBriqWidgetContainer();
        var widget = getBriqWidget();
        if (widget && widget.getAttribute('data-domain') !== config.domain) {
            return { domainMismatch: true };
        }

        if (!container) {
            var panel = mountedPanel && mountedPanel.panelEl ? mountedPanel.panelEl : document.getElementById('ticketPanel');
            var panelContent = panel && panel.querySelector ? panel.querySelector('.ticket-panel-content') : null;
            container = document.createElement('div');
            container.id = 'briq-widget-container';
            container.className = 'briq-panel-widget';
            container.setAttribute('data-briq-panel-widget', '');
            (panelContent || document.body).appendChild(container);
        }
        ensureBriqLoadingIndicator(container);

        var toggle = getBriqOpenToggle();
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'bw-widget-toggle briq-widget-toggle-proxy';
            toggle.setAttribute('data-briq-open-toggle', '');
            toggle.setAttribute('aria-hidden', 'true');
            toggle.setAttribute('tabindex', '-1');
            toggle.textContent = 'Open booking';
            container.appendChild(toggle);
        }
        toggle.setAttribute('data-widget-state', 'bwr=bu|is|' + config.domain + '|and|o|is|true');

        if (!widget) {
            widget = document.createElement('div');
            configureBriqWidget(widget, config);
            container.appendChild(widget);
        }

        return { container: container, widget: widget };
    }

    function loadBriqWidgetScript(onReady) {
        var existing = document.querySelector('script[data-briq-widget-script]');
        function ready() {
            if (typeof onReady === 'function') onReady();
        }
        if (existing) {
            existing.addEventListener('load', function () {
                existing.setAttribute('data-briq-widget-loaded', 'true');
                ready();
            }, { once: true });
            setTimeout(ready, 0);
            return;
        }
        var script = document.createElement('script');
        script.async = true;
        script.src = BRIQ_WIDGET_SCRIPT_SRC;
        script.setAttribute('data-briq-widget-script', '');
        script.addEventListener('load', function () {
            script.setAttribute('data-briq-widget-loaded', 'true');
            ready();
        }, { once: true });
        var firstScript = document.getElementsByTagName && document.getElementsByTagName('script')[0];
        if (firstScript && firstScript.parentNode) {
            firstScript.parentNode.insertBefore(script, firstScript);
        } else {
            document.head.appendChild(script);
        }
    }

    function briqWidgetDomains() {
        var records = [];
        if (window.TM && Array.isArray(window.TM.locations)) {
            records = window.TM.locations;
        } else if (window.TM_DATA && Array.isArray(window.TM_DATA.locations)) {
            records = window.TM_DATA.locations;
        }
        var domains = {};
        records.forEach(function (record) {
            var config = briqConfigForLocation(record);
            if (config && config.domain) domains[config.domain] = true;
        });
        return Object.keys(domains);
    }

    function isCurrentLocationPage(loc) {
        var pageLocation = BookingJourney.normalizeLocation((document.body && document.body.dataset.location) || '');
        if (!loc || !pageLocation) return false;
        return pageLocation === BookingJourney.normalizeLocation(loc.id || '')
            || pageLocation === BookingJourney.normalizeLocation(loc.slug || '');
    }

    function routeToBriqVenuePage(loc) {
        var slug = loc && (loc.slug || loc.id || '');
        if (!slug) return false;
        window.location.assign(BookingJourney.appendTrackingParams('/' + slug + '?book=1', { includeInternal: true }));
        return true;
    }

    function shouldForceBriqVenuePage(loc) {
        return briqWidgetDomains().length > 1 && !isCurrentLocationPage(loc);
    }

    function briqWidgetState(open) {
        var widget = getBriqWidget();
        var domain = widget && widget.getAttribute('data-domain');
        return 'bwr='
            + (domain ? 'bu|is|' + domain + '|and|' : '')
            + 'o|is|' + (open ? 'true' : 'false');
    }

    function setBriqPanelMode(enabled) {
        var panel = mountedPanel && mountedPanel.panelEl ? mountedPanel.panelEl : document.getElementById('ticketPanel');
        if (!panel || !panel.classList) return;
        if (enabled) panel.classList.add('ticket-panel--briq');
        else panel.classList.remove('ticket-panel--briq');
    }

    function stopBriqOpenRetry() {
        if (!briqOpenRetryTimer) return;
        clearTimeout(briqOpenRetryTimer);
        briqOpenRetryTimer = null;
    }

    function stopBriqFitRetry() {
        if (!briqFitRetryTimer) return;
        clearTimeout(briqFitRetryTimer);
        briqFitRetryTimer = null;
    }

    function disconnectBriqCloseObserver() {
        if (!briqCloseObserver) return;
        briqCloseObserver.disconnect();
        briqCloseObserver = null;
    }

    function setBriqWidgetOpen(open) {
        var toggle = getBriqOpenToggle();
        if (!toggle || typeof toggle.click !== 'function') return false;
        toggle.setAttribute('data-widget-state', briqWidgetState(open));
        toggle.click();
        return true;
    }

    function viewportSize() {
        return {
            width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
            height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
        };
    }

    function setImportantStyle(el, prop, value) {
        if (!el || !el.style) return;
        el.style.setProperty(prop, value, 'important');
    }

    function setBriqWidgetMainVisibility(visible) {
        var main = getBriqWidgetMain();
        if (!main) return;
        setImportantStyle(main, 'visibility', visible ? 'visible' : 'hidden');
    }

    function fitBriqWidgetLayout() {
        var main = getBriqWidgetMain();
        if (!main) return false;
        var panel = mountedPanel && mountedPanel.panelEl ? mountedPanel.panelEl : document.getElementById('ticketPanel');
        var viewport = viewportSize();
        var width = viewport.width;
        var height = viewport.height;
        var widgetWidth;
        var scale = 1;

        setImportantStyle(main, 'transition', 'none');
        setImportantStyle(main, 'animation', 'none');

        if (width <= 420) {
            widgetWidth = 420;
            scale = Math.max(0.72, width / 420);
            setImportantStyle(main, 'width', widgetWidth + 'px');
            setImportantStyle(main, 'height', (height / scale) + 'px');
            setImportantStyle(main, 'transform', 'scale(' + scale + ')');
            setImportantStyle(main, 'transform-origin', 'left top');
            setImportantStyle(main, 'left', '0');
            setImportantStyle(main, 'right', 'auto');
        } else {
            widgetWidth = width <= 650 ? width : Math.min(634, width);
            setImportantStyle(main, 'width', widgetWidth + 'px');
            setImportantStyle(main, 'height', height + 'px');
            setImportantStyle(main, 'transform', 'none');
            setImportantStyle(main, 'transform-origin', 'right top');
            setImportantStyle(main, 'left', width <= 650 ? '0' : 'auto');
            setImportantStyle(main, 'right', width <= 650 ? 'auto' : '0');
        }

        setImportantStyle(main, 'top', '0');
        setImportantStyle(main, 'bottom', 'auto');
        setImportantStyle(main, '--base-font-size', width <= 375 ? '16px' : '17px');

        if (panel && panel.style) {
            panel.style.setProperty('--briq-panel-width', (width <= 650 ? width : widgetWidth) + 'px');
        }
        return true;
    }

    function scheduleBriqWidgetFit() {
        stopBriqFitRetry();
        fitBriqWidgetLayout();
        briqFitRetryTimer = setTimeout(function () {
            fitBriqWidgetLayout();
        }, 250);
    }

    function ensureBriqResizeHandler() {
        if (briqResizeHandlerAttached) return;
        briqResizeHandlerAttached = true;
        window.addEventListener('resize', function () {
            scheduleBriqWidgetFit();
            setTimeout(fitBriqWidgetLayout, 650);
        });
    }

    function observeBriqClose() {
        var main = getBriqWidgetMain();
        if (!main || typeof MutationObserver !== 'function') return;
        disconnectBriqCloseObserver();
        briqCloseObserver = new MutationObserver(function () {
            if (main.classList.contains('bw-open')) {
                scheduleBriqWidgetFit();
                return;
            }
            setBriqPanelMode(false);
            disconnectBriqCloseObserver();
            if (mountedPanel && mountedPanel.panelEl && mountedPanel.panelEl.classList.contains('active') && typeof mountedPanel.closePanel === 'function') {
                mountedPanel.closePanel();
            }
        });
        briqCloseObserver.observe(main, { attributes: true, attributeFilter: ['class'] });
    }

    function triggerBriqWidgetOpen(attempt) {
        var main = getBriqWidgetMain();
        var container = getBriqWidgetContainer();
        if (main && main.classList.contains('bw-open')) {
            stopBriqOpenRetry();
            fitBriqWidgetLayout();
            setBriqWidgetMainVisibility(true);
            setBriqLoadingState(container, false);
            scheduleBriqWidgetFit();
            observeBriqClose();
            return true;
        }
        if (attempt > 60) return false;
        if (main) {
            setBriqWidgetMainVisibility(false);
            fitBriqWidgetLayout();
        }
        setBriqWidgetOpen(true);
        scheduleBriqWidgetFit();
        stopBriqOpenRetry();
        briqOpenRetryTimer = setTimeout(function () {
            triggerBriqWidgetOpen(attempt + 1);
        }, 100);
        return true;
    }

    function hideBriqWidget(options) {
        var container = getBriqWidgetContainer();
        stopBriqOpenRetry();
        stopBriqFitRetry();
        disconnectBriqCloseObserver();
        setBriqPanelMode(false);
        if (container) {
            container.classList.remove('is-highlighted');
            setBriqLoadingState(container, false);
        }
        if (!options || options.closeProvider !== false) setBriqWidgetOpen(false);
    }

    function showBriqWidget(loc) {
        if (shouldForceBriqVenuePage(loc)) {
            return routeToBriqVenuePage(loc);
        }
        var host = ensureBriqWidgetHost(loc);
        if (!host) return false;
        if (host.domainMismatch) {
            return routeToBriqVenuePage(loc);
        }
        var container = host.container;
        setBriqWidgetMainVisibility(false);
        fitBriqWidgetLayout();
        setBriqPanelMode(true);
        if (mountedPanel && typeof mountedPanel.openPanel === 'function') {
            mountedPanel.openPanel({
                kind: 'tickets',
                locationId: (loc && (loc.id || loc.slug)) || '',
                briqPanel: true,
            });
        }
        setBriqPanelMode(true);
        ensureBriqResizeHandler();
        setBriqLoadingState(container, true);
        container.classList.remove('is-highlighted');
        void container.offsetWidth;
        container.classList.add('is-highlighted');
        loadBriqWidgetScript(function () {
            triggerBriqWidgetOpen(0);
            setTimeout(scheduleBriqWidgetFit, 600);
        });
        return true;
    }

    function openBriqWidget(loc) {
        showBriqWidget(loc);
    }

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
        title.textContent = translate('booking.frame.title', 'Complete Your Booking');

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'booking-frame-close';
        close.setAttribute('aria-label', translate('booking.frame.close', 'Close booking'));
        close.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

        var iframe = document.createElement('iframe');
        iframe.className = 'booking-frame';
        iframe.title = translate('booking.frame.iframeTitle', 'Time Mission booking');
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
        document.addEventListener('tm:language-changed', function () {
            title.textContent = translate('booking.frame.title', 'Complete Your Booking');
            close.setAttribute('aria-label', translate('booking.frame.close', 'Close booking'));
            iframe.title = translate('booking.frame.iframeTitle', 'Time Mission booking');
        });
        return bookingFrame;
    }

    function showBookingFrame(loc, href) {
        if (!BookingJourney.isExternalHttpUrl(href)) return false;
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

    function executeNavigationAction(action, loc, options) {
        var opts = options || {};
        if (opts.cleanBookParam) cleanBookParamFromCurrentUrl();

        if (action.type === 'panel') {
            return false;
        }
        if (action.type === 'external-site') {
            window.location.assign(action.href);
            return true;
        }
        if (action.type === 'briq-widget') {
            openBriqWidget(loc);
            return true;
        }
        if (action.type === 'roller') {
            showRollerCheckout(loc, function () { showBookingFrame(loc, action.href); });
            return true;
        }
        if (action.type === 'iframe') {
            showBookingFrame(loc, action.href);
            return true;
        }
        if (action.type.indexOf('deferred-') === 0) {
            function doDeferredNav() {
                setTimeout(function () {
                    if (action.type === 'deferred-briq-widget') {
                        openBriqWidget(loc);
                    } else if (action.type === 'deferred-roller') {
                        showRollerCheckout(loc, function () { showBookingFrame(loc, action.href); });
                    } else if (action.type === 'deferred-iframe') {
                        showBookingFrame(loc, action.href);
                    } else {
                        window.location.href = action.href;
                    }
                }, 300);
            }
            if (document.readyState === 'complete') {
                doDeferredNav();
            } else {
                window.addEventListener('load', doDeferredNav);
            }
            return true;
        }

        window.location.assign(action.href);
        return true;
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

        if (locSelect) {
            locSelect.addEventListener('change', function () {
                selectSiteLocation(locSelect.value, 'ticket_panel_dropdown');
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
