// ==========================================
// BOOKING FRAME ADAPTER
// ==========================================
(function () {
    'use strict';

    var bookingFrame = null;

    function translate(key, fallback, replacements) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback, replacements);
        }
        return Object.keys(replacements || {}).reduce(function (value, token) {
            return value.replace(new RegExp('\\{' + token + '\\}', 'g'), replacements[token]);
        }, fallback);
    }

    function isExternalHttpUrl(href) {
        if (window.TMBookingJourney && typeof window.TMBookingJourney.isExternalHttpUrl === 'function') {
            return window.TMBookingJourney.isExternalHttpUrl(href);
        }
        return /^https?:\/\//i.test(String(href || '').trim());
    }

    function localizedLocationName(loc) {
        var fallback = (loc && (loc.shortName || loc.name)) || 'Time Mission';
        var slug = String((loc && (loc.slug || loc.id)) || '').toLowerCase();
        return slug ? translate('location.name.' + slug, fallback) : fallback;
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
        var closeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        closeIcon.setAttribute('aria-hidden', 'true');
        closeIcon.setAttribute('focusable', 'false');
        closeIcon.setAttribute('viewBox', '0 0 24 24');
        closeIcon.setAttribute('fill', 'none');
        closeIcon.setAttribute('stroke', 'currentColor');
        closeIcon.setAttribute('stroke-width', '2');
        [
            ['18', '6', '6', '18'],
            ['6', '6', '18', '18'],
        ].forEach(function (points) {
            var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', points[0]);
            line.setAttribute('y1', points[1]);
            line.setAttribute('x2', points[2]);
            line.setAttribute('y2', points[3]);
            closeIcon.appendChild(line);
        });
        close.appendChild(closeIcon);

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
            locationName: '',
        };
        document.addEventListener('tm:language-changed', function () {
            title.textContent = bookingFrame.locationName
                ? translate('booking.frame.bookLocation', 'Book {location}', { location: bookingFrame.locationName })
                : translate('booking.frame.title', 'Complete Your Booking');
            close.setAttribute('aria-label', translate('booking.frame.close', 'Close booking'));
            iframe.title = translate('booking.frame.iframeTitle', 'Time Mission booking');
        });
        return bookingFrame;
    }

    function showBookingFrame(loc, href) {
        if (!isExternalHttpUrl(href)) return false;
        var frame = ensureBookingFrame();
        var name = localizedLocationName(loc);
        frame.locationName = name;
        frame.title.textContent = translate(
            'booking.frame.bookLocation',
            'Book {location}',
            { location: name }
        );
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

    window.TMBookingFrame = {
        show: showBookingFrame,
        close: closeBookingFrame,
    };
})();
