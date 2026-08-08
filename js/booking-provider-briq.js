// ==========================================
// BRIQ BOOKING PROVIDER
// ==========================================
(function () {
    'use strict';

    var BookingJourney = window.TMBookingJourney;
    if (!BookingJourney) throw new Error('TMBookingJourney must load before booking-provider-briq.js');

    var panelAdapter = null;
    var briqOpenRetryTimer = null;
    var briqCloseObserver = null;
    var briqFitRetryTimer = null;
    var briqResizeHandlerAttached = false;
    var BRIQ_WIDGET_SCRIPT_SRC = 'https://widgetcdn.briqbookings.com/widget/widget.js';
    var BRIQ_WIDGET_STYLE_HREF = '/css/briq-widget.css?v=2';
    var BRIQ_WIDGET_SCRIPT_TIMEOUT_MS = 8000;

    function translate(key, fallback) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback);
        }
        return fallback;
    }

    function getPanel() {
        if (panelAdapter && typeof panelAdapter.getPanelEl === 'function') return panelAdapter.getPanelEl();
        return document.getElementById('ticketPanel');
    }

    function openPanel(detail) {
        if (panelAdapter && typeof panelAdapter.openPanel === 'function') panelAdapter.openPanel(detail);
    }

    function closePanel() {
        if (panelAdapter && typeof panelAdapter.closePanel === 'function') panelAdapter.closePanel();
    }

    function setBriqPanelMode(enabled) {
        if (panelAdapter && typeof panelAdapter.setPanelMode === 'function') {
            panelAdapter.setPanelMode(enabled);
            return;
        }
        var panel = getPanel();
        if (!panel || !panel.classList) return;
        if (enabled) panel.classList.add('ticket-panel--briq');
        else panel.classList.remove('ticket-panel--briq');
    }

    function getBriqWidgetContainer() {
        return document.getElementById('briq-widget-container');
    }

    function getBriqWidget() {
        return document.getElementById('briq-widget');
    }

    function ensureBriqLoadingIndicator(container) {
        if (!container) return null;
        var loader = container.querySelector && container.querySelector('[data-briq-widget-loader]');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'briq-widget-loader';
            loader.setAttribute('data-briq-widget-loader', '');
            loader.setAttribute('role', 'status');
            loader.setAttribute('aria-live', 'polite');
            loader.innerHTML = '<span class="briq-widget-spinner" aria-hidden="true"></span><span class="briq-widget-loader-title"></span>';
            container.insertBefore(loader, container.firstChild || null);
        }
        var title = loader.querySelector && loader.querySelector('.briq-widget-loader-title');
        if (title && !container.classList.contains('is-error')) {
            title.textContent = translate('booking.briq.loading', 'Loading booking options');
        }
        return loader;
    }

    function setBriqLoadingState(container, isLoading) {
        if (!container || !container.classList) return;
        ensureBriqLoadingIndicator(container);
        container.classList.toggle('is-loading', !!isLoading);
        container.classList.toggle('is-ready', !isLoading);
        container.classList.remove('is-error');
        if (isLoading) {
            container.setAttribute('aria-busy', 'true');
        } else {
            container.removeAttribute('aria-busy');
        }
    }

    function setBriqErrorState(container) {
        if (!container || !container.classList) return;
        var loader = ensureBriqLoadingIndicator(container);
        container.classList.remove('is-loading');
        container.classList.remove('is-ready');
        container.classList.add('is-error');
        container.removeAttribute('aria-busy');
        if (loader) {
            var title = loader.querySelector && loader.querySelector('.briq-widget-loader-title');
            if (title) title.textContent = translate(
                'booking.briq.delayed',
                'Booking options are taking longer than expected.'
            );
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
        var buttonFallback = config.buttonText || 'BOOK NOW';
        widget.setAttribute('data-tm-briq-button-fallback', buttonFallback);
        widget.setAttribute('data-button-text', translate('booking.briq.button', buttonFallback));
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
            var panel = getPanel();
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
            toggle.textContent = translate('booking.briq.open', 'Open booking');
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

    function markBriqScriptLoaded(script) {
        if (!script) return;
        script.setAttribute('data-briq-widget-loaded', 'true');
        script.removeAttribute('data-briq-widget-error');
    }

    function markBriqScriptError(script) {
        if (!script) return;
        script.setAttribute('data-briq-widget-error', 'true');
        script.removeAttribute('data-briq-widget-loaded');
    }

    function bindBriqScriptLifecycle(script, onReady, onError) {
        var settled = false;
        var timeout = setTimeout(function () {
            fail(new Error('Briq widget script timed out'));
        }, BRIQ_WIDGET_SCRIPT_TIMEOUT_MS);

        function cleanup() {
            clearTimeout(timeout);
            script.removeEventListener('load', ready);
            script.removeEventListener('error', fail);
        }

        function ready() {
            if (settled) return;
            settled = true;
            cleanup();
            markBriqScriptLoaded(script);
            if (typeof onReady === 'function') onReady();
        }

        function fail(err) {
            if (settled) return;
            settled = true;
            cleanup();
            markBriqScriptError(script);
            if (script.parentNode) script.parentNode.removeChild(script);
            if (typeof onError === 'function') onError(err);
        }

        script.addEventListener('load', ready);
        script.addEventListener('error', fail);
    }

    function loadBriqWidgetScript(onReady, onError) {
        var existing = document.querySelector('script[data-briq-widget-script]');
        if (existing) {
            if (existing.getAttribute('data-briq-widget-loaded') === 'true') {
                setTimeout(function () {
                    if (typeof onReady === 'function') onReady();
                }, 0);
                return;
            }
            if (existing.getAttribute('data-briq-widget-error') === 'true') {
                if (existing.parentNode) existing.parentNode.removeChild(existing);
            } else {
                bindBriqScriptLifecycle(existing, onReady, onError);
                return;
            }
        }
        var failed = document.querySelector('script[data-briq-widget-script][data-briq-widget-error="true"]');
        if (failed && failed.parentNode) {
            failed.parentNode.removeChild(failed);
        }
        var script = document.createElement('script');
        script.async = true;
        script.src = BRIQ_WIDGET_SCRIPT_SRC;
        script.setAttribute('data-briq-widget-script', '');
        bindBriqScriptLifecycle(script, onReady, onError);
        var firstScript = document.getElementsByTagName && document.getElementsByTagName('script')[0];
        if (firstScript && firstScript.parentNode) {
            firstScript.parentNode.insertBefore(script, firstScript);
            return;
        }
        document.head.appendChild(script);
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
        var panel = getPanel();
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
            var panel = getPanel();
            if (panel && panel.classList && panel.classList.contains('active')) closePanel();
        });
        briqCloseObserver.observe(main, { attributes: true, attributeFilter: ['class'] });
    }

    function fallbackToBriqBookingUrl(loc, container) {
        stopBriqOpenRetry();
        stopBriqFitRetry();
        disconnectBriqCloseObserver();
        setBriqPanelMode(false);
        if (container) setBriqErrorState(container);
        var fallback = loc && loc.bookingUrl && String(loc.bookingUrl).trim();
        if (!fallback) return false;
        window.location.assign(BookingJourney.appendTrackingParams(fallback));
        return true;
    }

    function triggerBriqWidgetOpen(attempt, onFailure) {
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
        if (attempt > 60) {
            stopBriqOpenRetry();
            if (typeof onFailure === 'function') onFailure(new Error('Briq widget did not open'));
            return false;
        }
        if (main) {
            setBriqWidgetMainVisibility(false);
            fitBriqWidgetLayout();
        }
        setBriqWidgetOpen(true);
        scheduleBriqWidgetFit();
        stopBriqOpenRetry();
        briqOpenRetryTimer = setTimeout(function () {
            triggerBriqWidgetOpen(attempt + 1, onFailure);
        }, 100);
        return true;
    }

    function closeBriqWidget(options) {
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
        openPanel({
            kind: 'tickets',
            locationId: (loc && (loc.id || loc.slug)) || '',
            briqPanel: true,
        });
        ensureBriqResizeHandler();
        setBriqLoadingState(container, true);
        container.classList.remove('is-highlighted');
        void container.offsetWidth;
        container.classList.add('is-highlighted');
        loadBriqWidgetScript(function () {
            triggerBriqWidgetOpen(0, function () {
                fallbackToBriqBookingUrl(loc, container);
            });
            setTimeout(scheduleBriqWidgetFit, 600);
        }, function () {
            fallbackToBriqBookingUrl(loc, container);
        });
        return true;
    }

    function localizeBriqUi() {
        var container = getBriqWidgetContainer();
        if (!container) return;
        var loader = ensureBriqLoadingIndicator(container);
        var title = loader && loader.querySelector && loader.querySelector('.briq-widget-loader-title');
        if (title && container.classList.contains('is-error')) {
            title.textContent = translate('booking.briq.delayed', 'Booking options are taking longer than expected.');
        }
        var toggle = getBriqOpenToggle();
        if (toggle) toggle.textContent = translate('booking.briq.open', 'Open booking');
        var widget = getBriqWidget();
        if (widget) {
            var buttonFallback = widget.getAttribute('data-tm-briq-button-fallback') || 'BOOK NOW';
            widget.setAttribute('data-button-text', translate('booking.briq.button', buttonFallback));
        }
    }

    window.TMBookingBriq = {
        open: showBriqWidget,
        close: closeBriqWidget,
        setPanelAdapter: function (adapter) {
            panelAdapter = adapter || null;
        },
    };
    document.addEventListener('tm:language-changed', localizeBriqUi);
    if (window.TMI18n && window.TMI18n.ready && typeof window.TMI18n.ready.then === 'function') {
        window.TMI18n.ready.then(localizeBriqUi);
    }
})();
