/**
 * Time Mission — Location Manager
 * Handles location data loading, persistence (localStorage), and DOM updates.
 *
 * Usage:
 *   <script src="js/locations.js"></script>
 *   Automatically initializes on DOMContentLoaded.
 *
 * API:
 *   TM.locations    — array of all location objects
 *   TM.current      — currently selected location object (or null)
 *   TM.select(id)   — set active location by id, persists to localStorage
 *   TM.clear()      — clear selected location
 *   TM.ready        — promise that resolves when data is loaded
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'tm_location';

    // Resolve data path relative to site root
    function getDataUrl() {
        const base = document.querySelector('meta[name="tm-base"]');
        if (base) return base.content + 'data/locations.json';

        const path = window.location.pathname;
        const depth = (path.match(/\//g) || []).length - 1;
        const prefix = depth > 0 ? '../'.repeat(depth) : '';
        return prefix + 'data/locations.json';
    }

    /** Format hours object into readable strings */
    function formatHoursTable(hours) {
        if (!hours) return '';
        const dayLabels = {
            mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
            thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
        };
        const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        let rows = '';
        for (const day of dayOrder) {
            if (hours[day]) {
                rows += '<div class="footer-hours-row"><span>' + dayLabels[day] + '</span><span>' + hours[day].label + '</span></div>';
            }
        }
        return rows;
    }

    /** Build full address string */
    function formatAddress(addr) {
        if (!addr) return '';
        let parts = [];
        if (addr.line1) parts.push(addr.line1);
        if (addr.line2) parts.push(addr.line2);
        let cityLine = '';
        if (addr.city) cityLine += addr.city;
        if (addr.state) cityLine += ', ' + addr.state;
        if (addr.zip) cityLine += ' ' + addr.zip;
        if (cityLine) parts.push(cityLine);
        return parts.join('<br>');
    }

    let _readyResolve;
    const _readyPromise = new Promise(resolve => { _readyResolve = resolve; });

    const TM = {
        locations: [],
        current: null,
        _pendingSelect: null,

        /** Promise that resolves when location data is loaded */
        ready: _readyPromise,

        /** Load locations data from JSON */
        async load() {
            try {
                const url = getDataUrl();
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to load locations.json');
                const data = await res.json();
                TM.locations = data.locations || [];
            } catch (e) {
                console.warn('TM Locations: Could not load data —', e.message);
                TM.locations = [];
            }
            _readyResolve();
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

        /** Select a location and persist */
        select(id) {
            // If data hasn't loaded yet, queue the selection
            if (TM.locations.length === 0) {
                TM._pendingSelect = id;
                return;
            }
            const loc = TM.get(id);
            if (!loc) return;
            TM.current = loc;
            try {
                localStorage.setItem(STORAGE_KEY, id);
            } catch (e) { /* localStorage unavailable */ }
            TM.updateDOM();
            document.dispatchEvent(new CustomEvent('tm:location-changed', { detail: loc }));
        },

        /** Clear selected location */
        clear() {
            TM.current = null;
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) { /* localStorage unavailable */ }
            TM.updateDOM();
        },

        /** Restore location from localStorage */
        restore() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const loc = TM.get(saved);
                    if (loc) {
                        TM.current = loc;
                        return;
                    }
                    // If locations haven't loaded (e.g. file:// protocol),
                    // don't clear current — keep whatever was set by page script
                    if (TM.locations.length === 0) return;
                }
            } catch (e) { /* localStorage unavailable */ }
            // Only null out if we actually have data and no match
            if (TM.locations.length > 0) {
                TM.current = null;
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
                const inSubdir = window.location.pathname.includes('/locations/');
                const homePath = (inSubdir ? '../' : '') + loc.slug + '.html';
                document.querySelectorAll('.nav-logo, .location-dropdown-logo').forEach(el => {
                    el.href = homePath;
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
                const changeEl = infoPanel.querySelector('.footer-loc-change');

                if (nameEl) nameEl.textContent = loc.name;
                if (addrEl) addrEl.innerHTML = formatAddress(loc.address);
                if (phoneEl) {
                    phoneEl.textContent = loc.contact.phone;
                    phoneEl.href = 'tel:' + loc.contact.phone.replace(/[^\d+]/g, '');
                }
                if (hoursEl) hoursEl.innerHTML = formatHoursTable(loc.hours);
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

        /** Check if the current location is open right now */
        isOpenNow() {
            const hours = TM.getTodayHours();
            if (!hours) return null;
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const [openH, openM] = hours.open.split(':').map(Number);
            const [closeH, closeM] = hours.close.split(':').map(Number);
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

    /** Check if current page is the index/homepage */
    function isIndexPage() {
        const path = window.location.pathname;
        return path === '/' || path.endsWith('/index.html') || path.endsWith('/index.htm');
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
            TM._pendingSelect = null;
            TM.select(pendingId);
        }

        TM.updateDOM();

        // Wire up location dropdown links in nav (both attribute types)
        document.querySelectorAll('[data-tm-location]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                TM.select(el.dataset.tmLocation);
            });
        });

        // Wire up "Change Location" link in footer info panel
        document.querySelectorAll('.footer-loc-change').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                TM.clear();
            });
        });
    }

    // Expose globally
    window.TM = TM;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
