/**
 * Time Mission — Location Manager
 * Handles location data loading, page-scoped selection, and DOM updates.
 *
 * Data is provided by `/data/locations.json`; tests and file previews may set
 * `window.TM_DATA`.
 *
 * Usage:
 *   <script src="js/locations.js"></script>
 *   Automatically initializes on DOMContentLoaded.
 *
 * API:
 *   TM.locations           — array of all location objects
 *   TM.current             — currently selected location object (or null)
 *   TM.select(id, opts?)   — set active location by id; optional opts.cta_id for analytics
 *   TM.clear()             — clear selected location
 *   TM.restore()           — clear stale stored location state
 *   TM.ready               — resolves after location data is loaded
 *   TM.getSavedSlug()      — sync read of the active slug
 *   TM.onChange(callback)  — subscribe to select/clear/restore; returns unsubscribe fn
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'tm_location';
    const LEGACY_STORAGE_KEY = 'timeMissionLocation';
    const BookingJourney = window.TMBookingJourney;
    const LocationViews = window.TMLocationViews;
    if (!BookingJourney) throw new Error('TMBookingJourney must load before locations.js');
    if (!LocationViews) throw new Error('TMLocationViews must load before locations.js');

    function normalizeLocationId(value) {
        return BookingJourney.normalizeLocation(value);
    }

    /** Homepage paths where saved location should restore without changing URL */
    function isIndexPage() {
        const pathname = window.location.pathname;
        return pathname === '/' || pathname.endsWith('/index.html') || pathname.endsWith('/index.htm');
    }

    function resolveLocationRef(id) {
        if (!id) return TM.current;
        const normalized = normalizeLocationId(id);
        if (typeof TM.get === 'function') {
            const exact = TM.get(normalized);
            if (exact) return exact;
        }
        return TM.locations.find((loc) => {
            return normalizeLocationId(loc.id) === normalized
                || normalizeLocationId(loc.slug) === normalized
                || normalizeLocationId(loc.shortName) === normalized
                || normalizeLocationId(loc.name) === normalized;
        }) || null;
    }

    function isLocationScopedLocation(loc) {
        return !!(loc && !loc.externalUrl);
    }

    function clearStoredLocation() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (e) { /* localStorage unavailable */ }
    }

    function getLocationView(id) {
        const loc = resolveLocationRef(id);
        if (!loc) return null;
        return LocationViews.getLocationView(loc, id);
    }

    function normalizeBookingKind(value) {
        return BookingJourney.normalizeKind(value);
    }

    function getBookingCtaView(kind, id, opts) {
        const loc = id ? resolveLocationRef(id) : TM.current;
        const bookingKind = normalizeBookingKind(kind);
        const options = opts || {};
        const locationId = loc ? (loc.id || loc.slug || normalizeLocationId(id)) : normalizeLocationId(id);
        return LocationViews.getBookingCtaView(loc, {
            kind: bookingKind,
            locationId: locationId,
            groupType: options.groupType || options.pageGroupType || '',
            pageGroupType: options.pageGroupType || '',
            pageLocationSlug: options.pageLocationSlug || '',
        });
    }

    function applyBookingCtaView(el, cta) {
        LocationViews.applyBookingCtaView(el, cta);
    }

    function renderTickerItem(item, text) {
        const value = String(text || '').trim();
        item.textContent = '';

        if (value.includes('|')) {
            const parts = value.split('|').map(part => part.trim()).filter(Boolean);
            if (parts.length > 1) {
                const copy = document.createElement('span');
                copy.className = 'ticker-copy';
                copy.textContent = parts[0];

                const separator = document.createElement('span');
                separator.className = 'ticker-separator';
                separator.setAttribute('aria-hidden', 'true');
                separator.textContent = '|';

                const offer = document.createElement('span');
                offer.className = 'ticker-date';
                offer.textContent = parts.slice(1).join(' | ');

                item.append(copy, separator, offer);
                return;
            }
        }

        const match = value.match(/^(.*?\bGRAND OPENING)\s*(?:[-–—]\s*)?(.+)$/i);
        if (!match) {
            item.textContent = value;
            return;
        }

        const copy = document.createElement('span');
        copy.className = 'ticker-copy';
        copy.textContent = match[1].trim();

        const separator = document.createElement('span');
        separator.className = 'ticker-separator';
        separator.setAttribute('aria-hidden', 'true');
        separator.textContent = '-';

        const date = document.createElement('span');
        date.className = 'ticker-date';
        date.textContent = match[2].trim();

        item.append(copy, separator, date);
    }

    function translateText(key, fallback, replacements) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback, replacements);
        }

        return Object.entries(replacements || {}).reduce((text, entry) => {
            return text.replace(new RegExp('\\{' + entry[0] + '\\}', 'g'), entry[1]);
        }, fallback);
    }

    function getOverlayView(id, opts) {
        const loc = resolveLocationRef(id);
        return LocationViews.getOverlayView(loc, id, opts || {});
    }

    function listTicketOptions() {
        return LocationViews.listTicketOptions(TM.locations);
    }

    function updateDonationLinks(loc) {
        var hasDonationUrl = !!(loc && typeof loc.donationUrl === 'string' && loc.donationUrl.trim());
        document.querySelectorAll('[data-tm-donation-link]').forEach(function (el) {
            el.hidden = !hasDonationUrl;
        });
    }

    /** Must match src/lib/locations-fingerprint.ts (locationsFingerprintFromRecords). */
    function fingerprintRuntimeLocations(locs) {
        if (!locs || !locs.length) return '';
        var sorted = locs.slice().sort(function (a, b) {
            return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });
        var h = 5381;
        for (var li = 0; li < sorted.length; li++) {
            var loc = sorted[li];
            var chunk = loc.id + ':' + (loc.status || 'open') + '|';
            for (var i = 0; i < chunk.length; i++) {
                h = (Math.imul(33, h) + chunk.charCodeAt(i)) >>> 0;
            }
        }
        return ('00000000' + h.toString(16)).slice(-8);
    }

    function maybeTrackSiteContractStale() {
        var embed = window.__TM_SITE_CONTRACT__;
        if (!embed || !embed.locationsFingerprint) return;
        if (!TM.locations.length) return;
        var runtimeFp = fingerprintRuntimeLocations(TM.locations);
        if (runtimeFp === embed.locationsFingerprint) return;
        try {
            if (sessionStorage.getItem('tm_site_contract_stale') === '1') return;
            sessionStorage.setItem('tm_site_contract_stale', '1');
        } catch (e) {
            return;
        }
        if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
            window.TMAnalytics.track('site_contract_stale', {
                cta_id: 'locations_roster_drift',
            });
        }
    }

    let _readyResolve = function () {};
    let _readyResolved = false;
    const _readyPromise = new Promise(function (resolve) {
        _readyResolve = resolve;
    });

    function markReady() {
        if (_readyResolved) return;
        _readyResolved = true;
        _readyResolve();
    }

    function compactLocationSlug(value) {
        try {
            value = decodeURIComponent(String(value || ''));
        } catch (e) {
            value = String(value || '');
        }
        return value.toLowerCase().trim().replace(/\.html$/i, '').replace(/-/g, '');
    }

    function getUrlLocationSlug() {
        const firstSegment = ((window.location && window.location.pathname) || '')
            .split('/')
            .filter(Boolean)[0] || '';
        if (!firstSegment || !TM.locations.length) return '';
        const compactSegment = compactLocationSlug(firstSegment);
        const loc = TM.locations.find((entry) => {
            return compactLocationSlug(entry.id) === compactSegment
                || compactLocationSlug(entry.slug) === compactSegment
                || compactLocationSlug(entry.shortName) === compactSegment
                || compactLocationSlug(entry.name) === compactSegment;
        });
        return loc ? normalizeLocationId(loc.id || loc.slug || firstSegment) : '';
    }

    function getPageLocationSlug() {
        const bodySlug = normalizeLocationId((document.body && document.body.dataset.location) || '');
        return bodySlug || getUrlLocationSlug();
    }

    const TM = {
        locations: [],
        current: null,
        _pendingSelect: null,
        _pendingSelectOpts: null,
        _changeListeners: [],

        ready: _readyPromise,

        async load() {
            let data = (typeof window !== 'undefined' && window.TM_DATA) || null;
            if (!data && typeof fetch === 'function') {
                const url = (typeof window !== 'undefined' && window.__TM_DATA_URL__) || '/data/locations.json';
                try {
                    const response = await fetch(url, { credentials: 'same-origin' });
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    data = await response.json();
                } catch (e) {
                    if (window.__TM_DEBUG__) window.__TM_LAST_LOCATION_ERROR__ = e;
                }
            }
            if (data && Array.isArray(data.locations)) {
                TM.locations = data.locations;
            } else {
                TM.locations = [];
            }
            maybeTrackSiteContractStale();
        },

        /** Get a location by id */
        get(id) {
            return TM.locations.find(loc => loc.id === id) || null;
        },

        /** Get all open locations */
        getOpen() {
            return TM.locations.filter(loc => loc.status === 'open');
        },

        /** Get locations by region */
        getByRegion(region) {
            return TM.locations.filter(loc => loc.region === region);
        },

        normalizeSlug(value) {
            return normalizeLocationId(value);
        },

        isIndexPath() {
            return isIndexPage();
        },

        getSavedSlug() {
            const loc = isLocationScopedLocation(TM.current) ? TM.current : null;
            return loc ? normalizeLocationId(loc.slug || loc.id || '') : '';
        },

        onChange(callback) {
            if (typeof callback !== 'function') return function () {};
            TM._changeListeners.push(callback);
            return function unsubscribe() {
                const idx = TM._changeListeners.indexOf(callback);
                if (idx !== -1) TM._changeListeners.splice(idx, 1);
            };
        },

        _emitChange() {
            for (let i = 0; i < TM._changeListeners.length; i++) {
                try { TM._changeListeners[i](TM.current); } catch (e) { /* swallow listener errors */ }
            }
        },

        select(id, opts) {
            if (TM.locations.length === 0) {
                TM._pendingSelect = id;
                TM._pendingSelectOpts = opts || null;
                return;
            }
            const loc = TM.get(id);
            if (!loc) return;
            TM.current = loc;
            clearStoredLocation();
            TM.updateDOM();
            TM._emitChange();
            document.dispatchEvent(new CustomEvent('tm:location-changed', { detail: loc }));
            if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
                var payload = {
                    location_slug: loc.slug || loc.id,
                    region: loc.region || '',
                };
                if (opts && opts.cta_id) payload.cta_id = opts.cta_id;
                window.TMAnalytics.track('location_select', payload);
            }
        },

        clear() {
            TM.current = null;
            clearStoredLocation();
            TM.updateDOM();
            TM._emitChange();
        },

        restore() {
            clearStoredLocation();
            if (TM.locations.length > 0) {
                TM.current = null;
                TM._emitChange();
            }
        },

        updateDOM() {
            const loc = TM.current;
            const selectedLocationName = loc ? (loc.shortName || loc.name || '') : '';

            const locationText = document.getElementById('locationText');
            if (locationText) {
                if (selectedLocationName) {
                    locationText.textContent = selectedLocationName;
                } else if (TM.locations.length > 0) {
                    locationText.textContent = 'Select Location';
                }
            }

            const locationBtn = document.getElementById('locationBtn');
            if (locationBtn) {
                locationBtn.classList.toggle('has-location', Boolean(selectedLocationName));
                locationBtn.setAttribute('aria-label', selectedLocationName
                    ? translateText('nav.changeLocationWithName', 'Change location: {location}', { location: selectedLocationName })
                    : translateText('nav.changeLocation', 'Change location'));
            }

            const nav = document.getElementById('nav');
            if (nav) {
                nav.classList.toggle('has-location', Boolean(selectedLocationName));
            }

            const pageLocationSlug = getPageLocationSlug();
            const locView = loc ? getLocationView(loc.id || loc.slug) : null;
            if (loc && locView && (locView.bookable || loc.status === 'coming-soon' || loc.status === 'temporarily-closed')) {
                document.querySelectorAll('.btn-tickets, .btn-book-now').forEach(el => {
                    const bookingKind = (el.getAttribute('data-tm-booking-kind') || 'tickets').toLowerCase();
                    if (bookingKind !== 'tickets') return;
                    applyBookingCtaView(el, getBookingCtaView('tickets', locView.locationId || loc.id || loc.slug, {
                        pageLocationSlug: pageLocationSlug,
                    }));
                });
            }

            if (loc && loc.ticker && pageLocationSlug === normalizeLocationId(loc.slug || loc.id)) {
                document.querySelectorAll('.ticker-track').forEach(track => {
                    if (track.dataset.tmTickerSource === 'cms') return;
                    const items = track.querySelectorAll('.ticker-item');
                    items.forEach(item => { renderTickerItem(item, loc.ticker); });
                });
            }

            if (loc) {
                document.querySelectorAll('[data-tm-field]').forEach(el => {
                    const field = el.dataset.tmField;
                    const value = resolveField(loc, field);
                    if (value !== undefined) {
                        el.textContent = value;
                    }
                });

                document.querySelectorAll('[data-tm-href]').forEach(el => {
                    const field = el.dataset.tmHref;
                    const value = resolveField(loc, field);
                    if (value) el.href = value;
                });
            }

            document.querySelectorAll('[data-tm-location]').forEach(el => {
                el.classList.toggle('active', loc && el.dataset.tmLocation === loc.id);
            });
            document.querySelectorAll('[data-city]').forEach(el => {
                const cityVal = el.dataset.city.toLowerCase().replace(/\s+/g, '-');
                el.classList.toggle('active', loc && cityVal === loc.id);
            });

            TM.updateTestimonials();
            TM.updateFooterLocation();
            updateDonationLinks(loc);
        },

        updateTestimonials() {
            LocationViews.updateTestimonials(TM.current);
        },

        updateFooterLocation() {
            LocationViews.updateFooterLocation(TM.current);
        },

        getTodayHours() {
            if (!TM.current || !TM.current.hours) return null;
            if (TM.current.status === 'temporarily-closed') return null;
            const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const today = days[new Date().getDay()];
            return TM.current.hours[today] || null;
        },

        isOpenNow() {
            const hours = TM.getTodayHours();
            if (!hours || typeof hours.open !== 'string' || typeof hours.close !== 'string') return null;
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const [openH, openM] = hours.open.split(':').map(Number);
            const [closeH, closeM] = hours.close.split(':').map(Number);
            if (Number.isNaN(openH) || Number.isNaN(closeH)) return null;
            const openMinutes = openH * 60 + openM;
            let closeMinutes = closeH * 60 + closeM;
            if (closeMinutes === 0) closeMinutes = 24 * 60;
            return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
        }
    };

    function resolveField(obj, path) {
        return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : undefined), obj);
    }

    async function init() {
        await TM.load();
        clearStoredLocation();
        const pageLocationSlug = getPageLocationSlug();
        const pageLocation = pageLocationSlug ? TM.get(pageLocationSlug) : null;

        if (pageLocation) {
            TM.current = pageLocation;
            TM._emitChange();
        } else {
            TM.restore();
        }

        if (TM._pendingSelect) {
            const pendingId = TM._pendingSelect;
            const pendingOpts = TM._pendingSelectOpts;
            TM._pendingSelect = null;
            TM._pendingSelectOpts = null;
            TM.select(pendingId, pendingOpts);
        }

        TM.updateDOM();
        document.dispatchEvent(new CustomEvent('tm:locations-ready', { detail: TM.current }));

        document.querySelectorAll('[data-tm-location]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                TM.select(el.dataset.tmLocation);
            });
        });

        document.querySelectorAll('.footer-loc-change').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const overlay = document.getElementById('locationDropdown');
                const navEl = document.getElementById('nav');
                if (!overlay) return;
                overlay.classList.add('open');
                if (navEl) navEl.classList.add('location-open');
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    document.body.style.overflow = 'hidden';
                }));
            });
        });

        markReady();
    }

    const CHANGE_EVENT = 'tm:location-changed';
    const LocationContext = {
        ready: TM.ready,
        async init() {
            await TM.ready;
        },
        getCurrent() {
            return TM.current;
        },
        getAll() {
            return Array.isArray(TM.locations) ? TM.locations.slice() : [];
        },
        get(id) {
            return typeof TM.get === 'function' ? TM.get(id) : null;
        },
        normalizeSlug(value) {
            return normalizeLocationId(value);
        },
        isIndexPath() {
            return isIndexPage();
        },
        getSavedSlug() {
            return typeof TM.getSavedSlug === 'function' ? TM.getSavedSlug() : '';
        },
        listTicketOptions() {
            return listTicketOptions();
        },
        getLocationView(id) {
            return getLocationView(id);
        },
        getOverlayView(id, opts) {
            return getOverlayView(id, opts);
        },
        getBookingCtaView(kind, id, opts) {
            return getBookingCtaView(kind, id, opts);
        },
        applyBookingCtaView(el, cta) {
            applyBookingCtaView(el, cta);
        },
        select(id, opts) {
            if (typeof TM.select === 'function') TM.select(id, opts);
        },
        clear() {
            if (typeof TM.clear === 'function') TM.clear();
        },
        subscribe(listener) {
            if (typeof listener !== 'function') return function () {};
            const handler = function (event) {
                listener(event.detail || null);
            };
            document.addEventListener(CHANGE_EVENT, handler);
            return function unsubscribe() {
                document.removeEventListener(CHANGE_EVENT, handler);
            };
        }
    };
    window.LocationContext = LocationContext;
    window.TM = TM;

    document.addEventListener('tm:language-changed', function () {
        if (TM.current) TM.updateDOM();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
