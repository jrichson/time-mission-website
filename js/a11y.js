(function () {
    'use strict';

    function ensureSkipLink() {
        if (document.querySelector('.skip-link')) return;

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
        link.textContent = 'Skip to main content';
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
        dialog.setAttribute('aria-label', 'Select your location');

        var closeButton = dialog.querySelector('.location-dropdown-close');
        if (closeButton) closeButton.setAttribute('aria-label', 'Close location selector');

        trapFocus(dialog, function () {
            return dialog.classList.contains('open');
        });
    }

    function enhanceTicketDialog() {
        var dialog = document.getElementById('ticketPanel');
        if (!dialog) return;

        var heading = dialog.querySelector('.ticket-panel-header h3');
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
})();
