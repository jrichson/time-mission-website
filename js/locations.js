/**
 * Time Mission — Location Manager
 * Handles location data loading, persistence (localStorage), and DOM updates.
 *
 * Data is provided synchronously via `window.TM_DATA` (inlined by
 * src/components/SiteScripts.astro before this script tag). No fetch.
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
 *   TM.restore()           — restore from localStorage; migrates legacy key once
 *   TM.ready               — Promise.resolve() (kept for backward compat with .then consumers)
 *   TM.getSavedSlug()      — sync read of canonical persisted slug; heals legacy key once
 *   TM.onChange(callback)  — subscribe to select/clear/restore; returns unsubscribe fn
 *
 * SINGLE-WRITER INVARIANT (RFC #11):
 *   Only this file may call localStorage.setItem('tm_location', ...) or
 *   localStorage.setItem('timeMissionLocation', ...). Enforced at CI by
 *   scripts/check-locations-architecture.js.
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'tm_location';
    const LEGACY_STORAGE_KEY = 'timeMissionLocation';

    function renderAddressLines(container, addr) {
        if (!container) return;
        container.textContent = '';
        if (!addr) return;
        const parts = [];
        if (addr.line1) parts.push(addr.line1);
        if (addr.line2) parts.push(addr.line2);
        let cityLine = '';
        if (addr.city) cityLine += addr.city;
        if (addr.state) cityLine += ', ' + addr.state;
        if (addr.zip) cityLine += ' ' + addr.zip;
        if (cityLine) parts.push(cityLine);
        parts.forEach((part, idx) => {
            container.appendChild(document.createTextNode(part));
            if (idx < parts.length - 1) container.appendChild(document.createElement('br'));
        });
    }

    function renderHoursTable(container, hours) {
        if (!container) return;
        container.textContent = '';
        if (!hours) return;
        const dayLabels = {
            mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
            thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
        };
        const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        for (const day of dayOrder) {
            if (!hours[day] || !hours[day].label) continue;
            const row = document.createElement('div');
            row.className = 'footer-hours-row';
            const dayEl = document.createElement('span');
            dayEl.textContent = dayLabels[day];
            const timeEl = document.createElement('span');
            timeEl.textContent = hours[day].label;
            row.appendChild(dayEl);
            row.appendChild(timeEl);
            container.appendChild(row);
        }
    }

    function normalizeLocationId(value) {
        return String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

    /** Homepage paths where we skip auto-restore of saved location */
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

    function getMapQuery(loc) {
        if (loc && loc.address) {
            const parts = [];
            if (loc.address.line1) parts.push(loc.address.line1);
            if (loc.address.line2) parts.push(loc.address.line2);
            if (loc.address.city) parts.push(loc.address.city);
            if (loc.address.state) parts.push(loc.address.state);
            if (loc.address.zip) parts.push(loc.address.zip);
            if (loc.address.country) parts.push(loc.address.country);
            if (parts.length) return encodeURIComponent(parts.join(' '));
        }
        if (loc && loc.mapUrl) {
            const match = String(loc.mapUrl).match(/[?&]q=([^&]+)/i);
            if (match && match[1]) return match[1];
        }
        return '';
    }

    function getInfoPanelView(id) {
        const loc = resolveLocationRef(id);
        if (!loc) return null;
        const slug = loc.slug || loc.id || normalizeLocationId(id);
        const mapQuery = getMapQuery(loc);
        const pageUrl = slug ? '/' + slug : '/';
        const comingSoon = loc.status === 'coming-soon';
        const addressText = (function () {
            if (!loc.address) return '';
            const parts = [];
            if (loc.address.line1) parts.push(loc.address.line1);
            if (loc.address.line2) parts.push(loc.address.line2);
            let cityLine = '';
            if (loc.address.city) cityLine += loc.address.city;
            if (loc.address.state) cityLine += (cityLine ? ', ' : '') + loc.address.state;
            if (loc.address.zip) cityLine += (cityLine ? ' ' : '') + loc.address.zip;
            if (cityLine) parts.push(cityLine);
            return parts.join('\n');
        })();
        const hoursText = (function () {
            if (!loc.hours) return comingSoon ? 'Coming Soon' : '';
            const labels = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
            const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
            const lines = [];
            order.forEach((day) => {
                if (loc.hours[day] && loc.hours[day].label) {
                    lines.push(labels[day] + ': ' + loc.hours[day].label);
                }
            });
            return lines.join('\n');
        })();
        return {
            name: loc.shortName || loc.name || '',
            addressText: addressText,
            phone: (loc.contact && loc.contact.phone) || '',
            hoursText: hoursText,
            pageUrl: pageUrl,
            bookUrl: comingSoon ? pageUrl : pageUrl + '?book=1',
            bookLabel: comingSoon ? 'Sign Up' : 'Book Now',
            mapQuery: mapQuery,
            mapDirectionsUrl: mapQuery ? 'https://www.google.com/maps/dir/?api=1&destination=' + mapQuery : '',
            mapEmbedUrl: mapQuery ? 'https://www.google.com/maps?q=' + mapQuery + '&output=embed&z=12' : '',
            comingSoon: comingSoon,
        };
    }

    function listTicketOptions() {
        // Labels/order must match src/lib/ticket-options.ts (ticketPanelSelectOptions).
        return TM.locations.map((loc) => ({
            value: loc.id,
            label: (loc.shortName || loc.name || loc.id) + (loc.status === 'coming-soon' ? ' (Coming Soon)' : ''),
            status: loc.status || 'open',
        }));
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

    // RFC #11: data is provided synchronously via window.TM_DATA (inlined by
    // src/components/SiteScripts.astro). TM.ready resolves immediately to keep
    // existing .ready.then(...) consumers working unchanged.
    const _readyPromise = Promise.resolve();

    const TM = {
        locations: [],
        current: null,
        _pendingSelect: null,
        _pendingSelectOpts: null,
        _changeListeners: [],

        /** Resolved promise; kept for backward compat with existing .then consumers */
        ready: _readyPromise,

        /** Load locations data from synchronous window.TM_DATA injection */
        async load() {
            const data = (typeof window !== 'undefined' && window.TM_DATA) || null;
            if (data && Array.isArray(data.locations)) {
                TM.locations = data.locations;
            } else {
                // Defensive: matches the pre-RFC fetch-failure path
                console.warn('TM Locations: window.TM_DATA missing — locations unavailable');
                TM.locations = [];
            }
            maybeTrackSiteContractStale();
            // No _readyResolve() — ready is already resolved.
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

        /** Canonical slug normalization (aligned with `id` / `slug` keys) */
        normalizeSlug(value) {
            return normalizeLocationId(value);
        },

        /** Current URL is the marketing homepage */
        isIndexPath() {
            return isIndexPage();
        },

        /** Sync read of the canonical persisted slug. Heals legacy
         *  'timeMissionLocation' key once by writing canonical + removing legacy. */
        getSavedSlug() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) return saved;
                const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
                if (!legacy) return '';
                const slug = normalizeLocationId(legacy);
                // Migrate-once: write canonical, delete legacy permanently.
                try {
                    localStorage.setItem(STORAGE_KEY, slug);
                    localStorage.removeItem(LEGACY_STORAGE_KEY);
                } catch (e) { /* storage unavailable — return slug anyway */ }
                return slug;
            } catch (e) { return ''; }
        },

        /** Subscribe to location changes (select/clear/restore). Returns unsubscribe. */
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

        /** Select a location and persist */
        select(id, opts) {
            // If data hasn't loaded yet, queue the selection
            if (TM.locations.length === 0) {
                TM._pendingSelect = id;
                TM._pendingSelectOpts = opts || null;
                try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
                return;
            }
            const loc = TM.get(id);
            if (!loc) return;
            TM.current = loc;
            try {
                localStorage.setItem(STORAGE_KEY, id);
            } catch (e) { /* localStorage unavailable */ }
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

        /** Clear selected location */
        clear() {
            TM.current = null;
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) { /* localStorage unavailable */ }
            TM.updateDOM();
            TM._emitChange();
        },

        /** Restore location from localStorage; migrates legacy key once. */
        restore() {
            try {
                let saved = localStorage.getItem(STORAGE_KEY);
                if (!saved) {
                    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
                    if (legacy) {
                        saved = normalizeLocationId(legacy);
                        // Migrate-once heal: write canonical, remove legacy permanently.
                        try {
                            localStorage.setItem(STORAGE_KEY, saved);
                            localStorage.removeItem(LEGACY_STORAGE_KEY);
                        } catch (e) {}
                    }
                }
                if (saved) {
                    const loc = TM.get(saved);
                    if (loc) {
                        TM.current = loc;
                        TM._emitChange();
                        return;
                    }
                    // Saved slug doesn't match any location (data drift) — clear silently.
                    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
                }
            } catch (e) { /* localStorage unavailable */ }
            if (TM.locations.length > 0) {
                TM.current = null;
                TM._emitChange();
            }
        },

        /** Update all DOM elements that depend on location */
        updateDOM() {
            const loc = TM.current;

            // Nav location text — only update if we have data or a location set
            const locationText = document.getElementById('locationText');
            if (locationText) {
                if (loc) {
                    locationText.textContent = loc.shortName;
                } else if (TM.locations.length > 0) {
                    // Only reset to default if we have loaded data (not on file:// failures)
                    locationText.textContent = 'Select Location';
                }
                // Otherwise leave whatever the page HTML set
            }

            // Tickets / Book Now buttons — update href
            if (loc && loc.bookingUrl) {
                document.querySelectorAll('.btn-tickets, .btn-book-now, [data-tm-booking]').forEach(el => {
                    el.href = loc.bookingUrl;
                });
            }

            // Nav logo — route home to the selected location's page
            if (loc && loc.slug) {
                const inSubdir = window.location.pathname.includes('/locations/') || window.location.pathname.includes('/groups/');
                const homePath = (inSubdir ? '../' : '/') + loc.slug;
                document.querySelectorAll('.nav-logo, .location-dropdown-logo').forEach(el => {
                    el.href = homePath;
                });
            }

            // Ticker bar — match the selected location's ticker message
            if (loc && loc.ticker) {
                document.querySelectorAll('.ticker-track').forEach(track => {
                    const items = track.querySelectorAll('.ticker-item');
                    items.forEach(item => { item.textContent = loc.ticker; });
                });
            }

            // Location-specific text content — [data-tm-field]
            if (loc) {
                document.querySelectorAll('[data-tm-field]').forEach(el => {
                    const field = el.dataset.tmField;
                    const value = resolveField(loc, field);
                    if (value !== undefined) {
                        el.textContent = value;
                    }
                });

                // Location-specific href — [data-tm-href]
                document.querySelectorAll('[data-tm-href]').forEach(el => {
                    const field = el.dataset.tmHref;
                    const value = resolveField(loc, field);
                    if (value) el.href = value;
                });
            }

            // Active state in location dropdowns (support both data-tm-location and data-city)
            document.querySelectorAll('[data-tm-location]').forEach(el => {
                el.classList.toggle('active', loc && el.dataset.tmLocation === loc.id);
            });
            document.querySelectorAll('[data-city]').forEach(el => {
                const cityVal = el.dataset.city.toLowerCase().replace(/\s+/g, '-');
                el.classList.toggle('active', loc && cityVal === loc.id);
            });

            // Testimonials — filter by location
            TM.updateTestimonials();

            // Footer — show location info when selected
            TM.updateFooterLocation();
        },

        /** Filter testimonial cards to show only matching location */
        updateTestimonials() {
            const loc = TM.current;
            const cards = document.querySelectorAll('.testimonial-card');
            if (!cards.length) return;

            // Check if any cards have location data attributes
            const hasLocationData = Array.from(cards).some(c => c.dataset.location);
            if (!hasLocationData) {
                // Fall back: check author-location text
                cards.forEach(card => {
                    const authorLoc = card.querySelector('.author-location');
                    if (authorLoc) {
                        const locText = authorLoc.textContent.replace('—', '').replace('–', '').trim().toLowerCase();
                        card.dataset.location = locText;
                    }
                });
            }

            if (!loc) {
                // No location selected — show all
                cards.forEach(card => { card.style.display = ''; });
                return;
            }

            const selectedCity = loc.shortName.toLowerCase();
            let hasVisible = false;
            cards.forEach(card => {
                const cardCity = (card.dataset.location || '').toLowerCase();
                if (cardCity === selectedCity) {
                    card.style.display = '';
                    hasVisible = true;
                } else {
                    card.style.display = 'none';
                }
            });

            // If no testimonials match this location, show all (better than empty)
            if (!hasVisible) {
                cards.forEach(card => { card.style.display = ''; });
            }
        },

        /** Show location info in footer when a location is selected */
        updateFooterLocation() {
            const loc = TM.current;
            const locationsColumn = document.querySelector('.footer-locations-column');
            if (!locationsColumn) return;

            const dropdown = locationsColumn.querySelector('.footer-locations-dropdown');
            const infoPanel = locationsColumn.querySelector('.footer-location-info');

            if (!loc) {
                // If the info panel already has hardcoded content (location pages), leave it alone
                if (infoPanel) {
                    const addrEl = infoPanel.querySelector('.footer-loc-address');
                    if (addrEl && addrEl.textContent.trim()) return;
                }

                // No location — show dropdown, hide info
                if (dropdown) dropdown.style.display = '';
                if (infoPanel) infoPanel.style.display = 'none';
                return;
            }

            // Hide dropdown, show info
            if (dropdown) dropdown.style.display = 'none';

            if (infoPanel) {
                infoPanel.style.display = '';

                const nameEl = infoPanel.querySelector('.footer-loc-name');
                const addrEl = infoPanel.querySelector('.footer-loc-address');
                const phoneEl = infoPanel.querySelector('.footer-loc-phone');
                const hoursEl = infoPanel.querySelector('.footer-loc-hours');
                const mapEl = infoPanel.querySelector('.footer-loc-map');

                if (nameEl) nameEl.textContent = loc.name || loc.shortName || '';
                if (addrEl) renderAddressLines(addrEl, loc.address);
                if (phoneEl && loc.contact && loc.contact.phone) {
                    phoneEl.textContent = loc.contact.phone;
                    phoneEl.href = 'tel:' + loc.contact.phone.replace(/[^\d+]/g, '');
                }
                if (hoursEl) renderHoursTable(hoursEl, loc.hours);
                if (mapEl) {
                    mapEl.href = loc.mapUrl || '#';
                    mapEl.style.display = loc.mapUrl ? '' : 'none';
                }
            }
        },

        /** Get today's hours for the current location */
        getTodayHours() {
            if (!TM.current || !TM.current.hours) return null;
            const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const today = days[new Date().getDay()];
            return TM.current.hours[today] || null;
        },

        /** Check if the current location is open right now (needs structured open/close; label-only hours return null) */
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

    /** Resolve a dot-notation field path on an object */
    function resolveField(obj, path) {
        return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : undefined), obj);
    }

    /** Initialize on DOM ready */
    async function init() {
        await TM.load();
        // Don't restore saved location on the index page — always show "Select Location"
        if (!isIndexPage()) {
            TM.restore();
        }

        // Process any pending selection (from location pages that called select before load)
        if (TM._pendingSelect) {
            const pendingId = TM._pendingSelect;
            const pendingOpts = TM._pendingSelectOpts;
            TM._pendingSelect = null;
            TM._pendingSelectOpts = null;
            TM.select(pendingId, pendingOpts);
        }

        TM.updateDOM();

        // Wire up location dropdown links in nav (both attribute types)
        document.querySelectorAll('[data-tm-location]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                TM.select(el.dataset.tmLocation);
            });
        });

        // Wire up "Change Location" link in footer info panel — opens the
        // full-screen location picker overlay so the user can select a new one.
        document.querySelectorAll('.footer-loc-change').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const overlay = document.getElementById('locationDropdown');
                const navEl = document.getElementById('nav');
                if (!overlay) return;
                overlay.classList.add('open');
                if (navEl) navEl.classList.add('location-open');
                // Defer scroll lock so it doesn't interrupt the overlay's fade-in
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    document.body.style.overflow = 'hidden';
                }));
            });
        });
    }

    // Expose globally
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
        listTicketOptions() {
            return listTicketOptions();
        },
        getInfoPanelView(id) {
            return getInfoPanelView(id);
        },
        select(id, opts) {
            if (typeof TM.select === 'function') TM.select(id, opts);
        },
        clear() {
            if (typeof TM.clear === 'function') TM.clear();
        },
        resolveBookingUrl(kind, id) {
            const loc = id ? (typeof TM.get === 'function' ? TM.get(id) : null) : TM.current;
            if (!loc) return '';
            const bookingKind = String(kind || 'tickets').toLowerCase();
            if (window.TMBooking && typeof window.TMBooking.resolveLocationDestination === 'function') {
                return window.TMBooking.resolveLocationDestination(loc, {
                    kind: bookingKind,
                    locationId: id || (loc && (loc.id || loc.slug)) || '',
                });
            }
            if (bookingKind === 'gift-cards' || bookingKind === 'giftcards') {
                return loc.giftCardUrl || '';
            }
            if (bookingKind === 'groups') {
                return loc.groupsUrl || '';
            }
            if (loc.status === 'coming-soon') {
                return '/' + (loc.slug || loc.id || '');
            }
            return loc.rollerCheckoutUrl || loc.bookingUrl || '';
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
