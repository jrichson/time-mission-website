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
        return fallback;
    }

    function openingLabelForLocation(loc) {
        if (!loc) return '';
        return String(loc.openingLabel || '').trim();
    }

    function comingSoonLabelForLocation(loc) {
        var openingLabel = openingLabelForLocation(loc);
        if (openingLabel && openingLabel.toLowerCase() !== 'coming soon') return openingLabel;
        return translate('location.comingSoon', openingLabel || 'Coming Soon');
    }

    function localizedFooterLocationName(loc) {
        var fallback = (loc && (loc.shortName || loc.name)) || 'LOCATIONS';
        if (!loc) return translate('nav.locations', fallback);
        var slug = normalizeLocation(loc.slug || loc.id);
        return slug ? translate('footer.city.' + slug, fallback) : fallback;
    }

    function temporaryClosureLabelForLocation(loc) {
        if (!loc || loc.status !== 'temporarily-closed') return '';
        return (loc.temporaryClosure && String(loc.temporaryClosure.label || '').trim()) || 'Temporarily Closed';
    }

    function statusLabelForLocation(loc) {
        return temporaryClosureLabelForLocation(loc) || comingSoonLabelForLocation(loc);
    }

    function renderAddressLines(container, addr) {
        if (!container) return;
        container.textContent = '';
        if (!addr) return;
        var parts = [];
        if (addr.line1) parts.push(addr.line1);
        if (addr.line2) parts.push(addr.line2);
        var cityLine = '';
        if (addr.city) cityLine += addr.city;
        if (addr.state) cityLine += ', ' + addr.state;
        if (addr.zip) cityLine += ' ' + addr.zip;
        if (cityLine) parts.push(cityLine);
        parts.forEach(function (part, idx) {
            container.appendChild(document.createTextNode(part));
            if (idx < parts.length - 1) container.appendChild(document.createElement('br'));
        });
    }

    function renderHoursTable(container, hours, fallback) {
        if (!container) return;
        container.textContent = '';
        if (!hours) hours = {};
        var rendered = false;
        var dayLabels = {
            mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
            thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
        };
        dayOrder.forEach(function (day) {
            if (!hours[day] || !hours[day].label) return;
            var row = document.createElement('div');
            row.className = 'footer-hours-row';
            var dayEl = document.createElement('span');
            dayEl.textContent = translate('footer.day.' + day, dayLabels[day]);
            var timeEl = document.createElement('span');
            timeEl.textContent = hours[day].label;
            row.appendChild(dayEl);
            row.appendChild(timeEl);
            container.appendChild(row);
            rendered = true;
        });
        if (!rendered && fallback) {
            var noteRow = document.createElement('div');
            noteRow.className = 'footer-hours-row footer-hours-row--note';
            var statusEl = document.createElement('span');
            statusEl.textContent = translate('location.status', 'Status');
            var fallbackEl = document.createElement('span');
            fallbackEl.textContent = fallback;
            noteRow.appendChild(statusEl);
            noteRow.appendChild(fallbackEl);
            container.appendChild(noteRow);
        }
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
        if (!loc) return '';
        if (loc.status === 'temporarily-closed') return temporaryClosureLabelForLocation(loc);
        if (!loc.hours) {
            return loc && loc.status === 'coming-soon' ? comingSoonLabelForLocation(loc) : '';
        }
        var lines = [];
        dayOrder.forEach(function (day) {
            if (loc.hours[day] && loc.hours[day].label) {
                lines.push(shortDayLabels[day] + ': ' + loc.hours[day].label);
            }
        });
        return lines.join('\n')
            || (loc.status === 'coming-soon' ? comingSoonLabelForLocation(loc) : '');
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

    function contactLeadUrl(slug, type) {
        var params = new URLSearchParams();
        if (slug) params.set('location', slug);
        if (type) params.set('type', type);
        var fragment = params.toString();
        return '/contact' + (fragment ? '#' + fragment : '');
    }

    function leadUrlForLocation(loc, slug, externalUrl) {
        if (externalUrl) return externalUrl;
        if (BookingJourney.isTemporarilyClosedLocation(loc)) {
            return contactLeadUrl(slug, 'closure');
        }
        if (BookingJourney.isLeadOnlyComingSoon(loc)) {
            return contactLeadUrl(slug, 'updates');
        }
        return '#';
    }

    function setHidden(el, hidden) {
        if (!el) return;
        el.hidden = Boolean(hidden);
    }

    function getLocationView(loc, id) {
        if (!loc) return null;
        var slug = loc.slug || loc.id || normalizeLocation(id);
        var mapQuery = getMapQuery(loc);
        var externalUrl = BookingJourney.getExternalLocationUrl(loc);
        var externalSiteLabel = loc.region === 'europe' ? 'Visit EU Site' : 'Visit Location Site';
        var pageUrl = loc.pagePath || externalUrl || (slug ? '/' + slug : '/');
        var comingSoon = loc.status === 'coming-soon';
        var temporarilyClosed = loc.status === 'temporarily-closed';
        var bookable = BookingJourney.isBookableLocation(loc);
        var bookingUrl = BookingJourney.resolveOpenCheckoutUrl(loc);
        var leadUrl = leadUrlForLocation(loc, slug, externalUrl);
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
            openingLabel: openingLabelForLocation(loc),
            bookLabel: temporarilyClosed
                ? BookingJourney.temporaryClosureCtaLabel(loc)
                : externalUrl
                ? externalSiteLabel
                : (bookable || !comingSoon ? 'Book Now' : 'Contact Us'),
            mapQuery: mapQuery,
            mapDirectionsUrl: mapQuery ? 'https://www.google.com/maps/dir/?api=1&destination=' + mapQuery : '',
            mapEmbedUrl: mapQuery ? 'https://www.google.com/maps?q=' + mapQuery + '&output=embed&z=12' : '',
            comingSoon: comingSoon && !bookable,
            temporarilyClosed: temporarilyClosed,
            status: loc.status || 'open',
            bookable: bookable,
            locationId: loc.id || slug,
        };
    }

    function getBookingCtaView(loc, options) {
        return BookingJourney.resolveCtaView(loc, options || {});
    }

    function externalLocationCta(view) {
        var href = BookingJourney.appendTrackingParams(view.externalUrl || view.pageUrl || '#');
        return {
            kind: 'tickets',
            groupType: '',
            locationId: view.locationId,
            href: href,
            bookingUrl: '',
            url: href,
            trigger: false,
            externalLocation: true,
            disabled: !href || href === '#',
            presentation: 'external-site',
        };
    }

    function getOverlayView(loc, id, options) {
        var view = getLocationView(loc, id);
        if (!view) return null;
        var cta = view.externalUrl ? externalLocationCta(view) : getBookingCtaView(loc, {
            kind: 'tickets',
            locationId: view.locationId,
            pageLocationSlug: options && options.pageLocationSlug,
        });
        var labelKey = view.externalUrl
            ? (loc.region === 'europe' ? 'location.visitEuSite' : 'location.visitLocationSite')
            : view.comingSoon
            ? 'location.contactUs'
            : 'nav.bookNow';
        return {
            location: view,
            cta: cta,
            bookLabelKey: labelKey,
            bookLabelFallback: view.bookLabel || (view.externalUrl ? 'Visit Location Site' : view.comingSoon ? 'Contact Us' : 'Book Now'),
        };
    }

    function applyBookingCtaView(el, cta) {
        BookingJourney.applyCtaView(el, cta);
    }

    function normalizeListDash(value) {
        return String(value || '').replace(/\s+[-–—]\s+/g, ' – ').trim();
    }

    function locationListCity(loc) {
        return (loc && (loc.shortName || (loc.address && loc.address.city) || loc.name || loc.id)) || '';
    }

    function locationListRegion(loc) {
        if (!loc) return '';
        if (loc.region === 'europe') {
            return (loc.address && loc.address.country) || loc.countryCode || '';
        }
        return (loc.address && loc.address.state) || loc.countryCode || '';
    }

    function locationListLabel(loc) {
        var region = locationListRegion(loc);
        var city = locationListCity(loc);
        if (region && city) return region + ' – ' + city;
        return normalizeListDash(loc && loc.navLabel) || city || (loc && loc.id) || '';
    }

    function locationListSortKey(loc) {
        var region = (loc && loc.region) || '';
        var primaryRegion = (window.__TM_SITE_PROFILE__ && window.__TM_SITE_PROFILE__.internalRegion) || 'us';
        var regionOrder = region === primaryRegion ? 0 : (region === 'us' || region === 'europe' ? 1 : 99);
        return [
            regionOrder,
            locationListRegion(loc).toLocaleUpperCase('en-US'),
            locationListCity(loc).toLocaleUpperCase('en-US'),
        ].join('|');
    }

    function sortLocationsForList(locations) {
        return (Array.isArray(locations) ? locations : []).slice().sort(function (a, b) {
            return locationListSortKey(a).localeCompare(locationListSortKey(b), 'en-US');
        });
    }

    function listTicketOptions(locations) {
        return sortLocationsForList(locations).map(function (loc) {
            var view = getLocationView(loc, loc.id || loc.slug);
            var statusSuffix = loc.status !== 'open'
                ? ' (' + (temporaryClosureLabelForLocation(loc) || openingLabelForLocation(loc) || (view && view.bookable
                    ? translate('booking.status.bookingNow', 'Booking Now')
                    : translate('location.comingSoon', 'Coming Soon'))) + ')'
                : '';
            return {
                value: loc.id,
                label: locationListLabel(loc) + statusSuffix,
                status: loc.status || 'open',
            };
        });
    }

    function updateTestimonials(loc) {
        var cards = document.querySelectorAll('.testimonial-card');
        if (!cards.length) return;

        var hasLocationData = Array.prototype.slice.call(cards).some(function (card) {
            return card.dataset.location;
        });
        if (!hasLocationData) {
            cards.forEach(function (card) {
                var authorLoc = card.querySelector('.author-location');
                if (authorLoc) {
                    card.dataset.location = authorLoc.textContent.replace('—', '').replace('–', '').trim().toLowerCase();
                }
            });
        }

        if (!loc) {
            cards.forEach(function (card) { card.style.display = ''; });
            return;
        }

        var selectedCity = String(loc.shortName || '').toLowerCase();
        var hasVisible = false;
        cards.forEach(function (card) {
            var visible = (card.dataset.location || '').toLowerCase() === selectedCity;
            card.style.display = visible ? '' : 'none';
            hasVisible = hasVisible || visible;
        });
        if (!hasVisible) cards.forEach(function (card) { card.style.display = ''; });
    }

    function updateFooterLocation(loc) {
        var locationsColumn = document.querySelector('.footer-locations-column');
        if (!locationsColumn) return;

        var dropdown = locationsColumn.querySelector('.footer-locations-dropdown');
        var infoPanel = locationsColumn.querySelector('.footer-location-info');
        var titleEl = locationsColumn.querySelector('.footer-locations-title');

        if (!loc) {
            if (titleEl) titleEl.textContent = localizedFooterLocationName(null);
            setHidden(dropdown, false);
            setHidden(infoPanel, true);
            return;
        }

        setHidden(dropdown, true);
        if (!infoPanel) return;

        setHidden(infoPanel, false);
        var addrEl = infoPanel.querySelector('.footer-loc-address');
        var phoneEl = infoPanel.querySelector('.footer-loc-phone');
        var phoneNoteEl = infoPanel.querySelector('.footer-loc-phone-note');
        var hoursDetails = infoPanel.querySelector('.footer-loc-hours-details');
        var hoursEl = infoPanel.querySelector('.footer-loc-hours');
        var mapEl = infoPanel.querySelector('.footer-loc-map');
        var displayName = localizedFooterLocationName(loc);

        if (titleEl) titleEl.textContent = displayName || 'LOCATIONS';
        if (hoursDetails) hoursDetails.removeAttribute('open');
        renderAddressLines(addrEl, loc.address);
        if (phoneEl && loc.contact && loc.contact.phone) {
            phoneEl.textContent = loc.contact.phone;
            phoneEl.href = 'tel:' + loc.contact.phone.replace(/[^\d+]/g, '');
            setHidden(phoneEl, false);
            setHidden(phoneNoteEl, true);
        } else {
            if (phoneEl) {
                phoneEl.textContent = '';
                phoneEl.removeAttribute('href');
                setHidden(phoneEl, true);
            }
            if (phoneNoteEl) {
                phoneNoteEl.textContent = translate('location.phoneComingSoon', 'Phone coming soon');
                setHidden(phoneNoteEl, false);
            }
        }
        renderHoursTable(hoursEl, loc.status === 'temporarily-closed' ? {} : loc.hours, loc.status === 'temporarily-closed' ? temporaryClosureLabelForLocation(loc) : loc.status === 'coming-soon' ? comingSoonLabelForLocation(loc) : translate('location.hoursComingSoon', 'Hours coming soon'));
        if (mapEl) {
            mapEl.href = loc.mapUrl || '#';
            setHidden(mapEl, !loc.mapUrl);
        }
    }

    window.TMLocationViews = {
        getLocationView: getLocationView,
        addressTextForLocation: addressTextForLocation,
        hoursTextForLocation: hoursTextForLocation,
        temporaryClosureLabelForLocation: temporaryClosureLabelForLocation,
        statusLabelForLocation: statusLabelForLocation,
        getMapQuery: getMapQuery,
        renderAddressLines: renderAddressLines,
        renderHoursTable: renderHoursTable,
        getBookingCtaView: getBookingCtaView,
        getOverlayView: getOverlayView,
        applyBookingCtaView: applyBookingCtaView,
        listTicketOptions: listTicketOptions,
        updateTestimonials: updateTestimonials,
        updateFooterLocation: updateFooterLocation,
    };
})();
