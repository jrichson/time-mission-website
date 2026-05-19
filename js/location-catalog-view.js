(function () {
    'use strict';

    var dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    var shortDayLabels = {
        mon: 'Mon',
        tue: 'Tue',
        wed: 'Wed',
        thu: 'Thu',
        fri: 'Fri',
        sat: 'Sat',
        sun: 'Sun',
    };

    var BookingJourney = window.TMBookingJourney;
    if (!BookingJourney) throw new Error('TMBookingJourney must load before location-catalog-view.js');

    function normalizeLocation(value) {
        return BookingJourney.normalizeLocation(value);
    }

    function translate(key, fallback) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback);
        }
        if (window.TMI18n && typeof window.TMI18n.t === 'function') {
            var translated = window.TMI18n.t(key);
            if (typeof translated === 'string') return translated;
        }
        return fallback;
    }

    function addressTextForLocation(loc) {
        if (!loc || !loc.address) return '';
        var parts = [];
        if (loc.address.line1) parts.push(loc.address.line1);
        if (loc.address.line2) parts.push(loc.address.line2);
        var cityLine = '';
        if (loc.address.city) cityLine += loc.address.city;
        if (loc.address.state) cityLine += (cityLine ? ', ' : '') + loc.address.state;
        if (loc.address.zip) cityLine += (cityLine ? ' ' : '') + loc.address.zip;
        if (cityLine) parts.push(cityLine);
        return parts.join('\n');
    }

    function hoursTextForLocation(loc) {
        if (!loc || !loc.hours) return loc && loc.status === 'coming-soon' ? 'Coming Soon' : '';
        var lines = [];
        dayOrder.forEach(function (day) {
            if (loc.hours[day] && loc.hours[day].label) {
                lines.push(shortDayLabels[day] + ': ' + loc.hours[day].label);
            }
        });
        return lines.join('\n') || (loc.status === 'coming-soon' ? 'Coming Soon' : '');
    }

    function getMapQuery(loc) {
        if (loc && loc.address) {
            var parts = [];
            if (loc.address.line1) parts.push(loc.address.line1);
            if (loc.address.line2) parts.push(loc.address.line2);
            if (loc.address.city) parts.push(loc.address.city);
            if (loc.address.state) parts.push(loc.address.state);
            if (loc.address.zip) parts.push(loc.address.zip);
            if (loc.address.country) parts.push(loc.address.country);
            if (parts.length) return encodeURIComponent(parts.join(' '));
        }
        if (loc && loc.mapUrl) {
            var match = String(loc.mapUrl).match(/[?&]q=([^&]+)/i);
            if (match && match[1]) return match[1];
        }
        return '';
    }

    function leadUrlForLocation(loc, slug, externalUrl, pageUrl) {
        if (externalUrl) return externalUrl;
        if (BookingJourney.isLeadOnlyComingSoon(loc)) {
            return pageUrl ? pageUrl + '#newsletter' : '/locations#newsletter';
        }
        return '#';
    }

    function getLocationView(loc, id) {
        if (!loc) return null;
        var slug = loc.slug || loc.id || normalizeLocation(id);
        var mapQuery = getMapQuery(loc);
        var externalUrl = BookingJourney.getExternalLocationUrl(loc);
        var pageUrl = externalUrl || (slug ? '/' + slug : '/');
        var comingSoon = loc.status === 'coming-soon';
        var bookable = BookingJourney.isBookableLocation(loc);
        var bookingUrl = BookingJourney.resolveOpenCheckoutUrl(loc);
        var leadUrl = leadUrlForLocation(loc, slug, externalUrl, pageUrl);
        return {
            id: loc.id || slug,
            slug: slug,
            raw: loc,
            name: loc.shortName || loc.name || '',
            fullName: loc.name || loc.shortName || '',
            addressText: addressTextForLocation(loc),
            phone: (loc.contact && loc.contact.phone) || '',
            hoursText: hoursTextForLocation(loc),
            pageUrl: pageUrl,
            bookUrl: leadUrl,
            bookingUrl: externalUrl ? '' : bookingUrl,
            checkoutUrl: bookingUrl,
            externalUrl: externalUrl,
            bookLabel: externalUrl ? 'Visit EU Site' : (bookable || !comingSoon ? 'Book Now' : 'Sign Up'),
            mapQuery: mapQuery,
            mapDirectionsUrl: mapQuery ? 'https://www.google.com/maps/dir/?api=1&destination=' + mapQuery : '',
            mapEmbedUrl: mapQuery ? 'https://www.google.com/maps?q=' + mapQuery + '&output=embed&z=12' : '',
            comingSoon: comingSoon && !bookable,
            status: loc.status || 'open',
            bookable: bookable,
            locationId: loc.id || slug,
        };
    }

    function getBookingCtaView(loc, options) {
        return BookingJourney.resolveCtaView(loc, options || {});
    }

    function getOverlayView(loc, id, options) {
        var view = getLocationView(loc, id);
        if (!view) return null;
        var cta = getBookingCtaView(loc, {
            kind: 'tickets',
            locationId: view.locationId,
            pageLocationSlug: options && options.pageLocationSlug,
        });
        var labelKey = view.externalUrl
            ? 'location.visitEuSite'
            : view.comingSoon
            ? 'location.signUp'
            : 'nav.bookNow';
        return {
            location: view,
            cta: cta,
            bookLabelKey: labelKey,
            bookLabelFallback: view.bookLabel || (view.externalUrl ? 'Visit EU Site' : view.comingSoon ? 'Sign Up' : 'Book Now'),
        };
    }

    function applyBookingCtaView(el, cta) {
        if (!el || !cta) return;
        el.href = cta.href || '#';
        el.removeAttribute('target');
        el.removeAttribute('rel');
        if (cta.disabled) {
            el.setAttribute('aria-disabled', 'true');
            if (el.classList) el.classList.add('is-disabled');
        } else {
            el.removeAttribute('aria-disabled');
            if (el.classList) el.classList.remove('is-disabled');
        }
        if (cta.trigger) {
            el.setAttribute('data-tm-booking-trigger', '');
            el.setAttribute('data-tm-booking-kind', cta.kind || 'tickets');
            if (cta.locationId) el.setAttribute('data-tm-location', cta.locationId);
            else el.removeAttribute('data-tm-location');
            if (cta.groupType) el.setAttribute('data-tm-group-type', cta.groupType);
            else el.removeAttribute('data-tm-group-type');
            if (cta.bookingUrl) el.setAttribute('data-tm-booking-url', cta.bookingUrl);
            else el.removeAttribute('data-tm-booking-url');
            return;
        }
        el.removeAttribute('data-tm-booking-trigger');
        el.removeAttribute('data-tm-booking-kind');
        el.removeAttribute('data-tm-location');
        el.removeAttribute('data-tm-group-type');
        el.removeAttribute('data-tm-booking-url');
    }

    function listTicketOptions(locations) {
        return (Array.isArray(locations) ? locations : []).map(function (loc) {
            var view = getLocationView(loc, loc.id || loc.slug);
            var statusSuffix = loc.status === 'coming-soon'
                ? ' (' + (view && view.bookable
                    ? translate('booking.status.bookingNow', 'Booking Now')
                    : translate('location.comingSoon', 'Coming Soon')) + ')'
                : '';
            return {
                value: loc.id,
                label: (view ? view.name : (loc.shortName || loc.name || loc.id)) + statusSuffix,
                status: loc.status || 'open',
            };
        });
    }

    window.TMLocationViews = {
        getLocationView: getLocationView,
        addressTextForLocation: addressTextForLocation,
        hoursTextForLocation: hoursTextForLocation,
        getMapQuery: getMapQuery,
        getBookingCtaView: getBookingCtaView,
        getOverlayView: getOverlayView,
        applyBookingCtaView: applyBookingCtaView,
        listTicketOptions: listTicketOptions,
    };
})();
