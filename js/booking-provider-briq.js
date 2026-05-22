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
            triggerBriqWidgetOpen(0);
            setTimeout(scheduleBriqWidgetFit, 600);
        });
        return true;
    }

    window.TMBookingBriq = {
        open: showBriqWidget,
        close: closeBriqWidget,
        setPanelAdapter: function (adapter) {
            panelAdapter = adapter || null;
        },
    };
})();
