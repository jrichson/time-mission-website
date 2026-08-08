(function () {
    'use strict';

    function translate(key, fallback) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback);
        }
        return fallback;
    }

    function ensureSkipLink() {
        var existing = document.querySelector('.skip-link');
        if (existing) {
            existing.textContent = translate('a11y.skipToMain', 'Skip to main content');
            return;
        }

        var target = document.querySelector('main, [role="main"], .page-header, .hero, .hero-section, .contact-section');
        if (!target) return;

        if (!target.id) target.id = 'main-content';
        if (!target.hasAttribute('role') && target.tagName.toLowerCase() !== 'main') {
            target.setAttribute('role', 'main');
        }
        if (!target.hasAttribute('tabindex')) {
            target.setAttribute('tabindex', '-1');
        }

        var link = document.createElement('a');
        link.className = 'skip-link';
        link.href = '#' + target.id;
        link.textContent = translate('a11y.skipToMain', 'Skip to main content');
        document.body.insertBefore(link, document.body.firstChild);
    }

    function getFocusable(container) {
        return Array.from(container.querySelectorAll([
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(','))).filter(function (element) {
            return element.offsetParent !== null;
        });
    }

    function trapFocus(container, isOpen) {
        if (container.getAttribute('data-tm-focus-trap') === 'true') return;
        container.setAttribute('data-tm-focus-trap', 'true');
        container.addEventListener('keydown', function (event) {
            if (event.key !== 'Tab' || !isOpen()) return;

            var focusable = getFocusable(container);
            if (!focusable.length) return;

            var first = focusable[0];
            var last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }

    function enhanceLocationDialog() {
        var dialog = document.getElementById('locationDropdown');
        if (!dialog) return;

        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', translate('a11y.selectLocationDialog', 'Select your location'));

        var closeButton = dialog.querySelector('.location-dropdown-close');
        if (closeButton) closeButton.setAttribute(
            'aria-label',
            translate('a11y.closeLocationSelector', 'Close location selector')
        );

        trapFocus(dialog, function () {
            return dialog.classList.contains('open');
        });
    }

    function enhanceTicketDialog() {
        var dialog = document.getElementById('ticketPanel');
        if (!dialog) return;

        var heading = dialog.querySelector('.ticket-panel-header h2');
        if (heading && !heading.id) heading.id = 'ticket-panel-title';

        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        if (heading) dialog.setAttribute('aria-labelledby', heading.id);

        trapFocus(dialog, function () {
            return dialog.classList.contains('active');
        });
    }

    function init() {
        ensureSkipLink();
        enhanceLocationDialog();
        enhanceTicketDialog();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    document.addEventListener('tm:language-changed', init);
    if (window.TMI18n && window.TMI18n.ready && typeof window.TMI18n.ready.then === 'function') {
        window.TMI18n.ready.then(init);
    }
})();
