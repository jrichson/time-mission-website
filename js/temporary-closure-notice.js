(function () {
    'use strict';

    var modal = document.querySelector('[data-temporary-closure-modal]');
    if (!modal) return;

    var closeControls = Array.prototype.slice.call(modal.querySelectorAll('[data-temporary-closure-close]'));
    var lastFocused = null;

    function focusFirstControl() {
        var target = modal.querySelector('[data-temporary-closure-close], a[href], button:not([disabled])');
        if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
    }

    function openModal() {
        if (!modal.hidden && modal.classList.contains('is-active')) return;
        lastFocused = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;
        modal.hidden = false;
        modal.removeAttribute('aria-hidden');
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(function () {
            modal.classList.add('is-active');
            focusFirstControl();
        });
    }

    function closeModal() {
        modal.classList.remove('is-active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        window.setTimeout(function () {
            modal.hidden = true;
        }, 250);
        if (lastFocused && document.contains(lastFocused) && typeof lastFocused.focus === 'function') {
            lastFocused.focus({ preventScroll: true });
        }
        lastFocused = null;
    }

    closeControls.forEach(function (control) {
        control.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', function (event) {
        if (event.target === modal) closeModal();
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !modal.hidden) closeModal();
    });

    document.addEventListener('tm:location-closure:open', openModal);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', openModal, { once: true });
    } else {
        openModal();
    }
})();
