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

    // Full fallback used when locations.json can't load
    // (e.g. file:// protocol blocks fetch, offline, transient network error).
    // Mirrors data/locations.json so the nav, Tickets/Buy-Gift-Card buttons,
    // AND the footer location info panel render identically without the JSON.
    // KEEP IN SYNC with data/locations.json.
    const FALLBACK = {
        'mount-prospect': {"name":"Time Mission Mount Prospect","shortName":"Mount Prospect","address":{"line1":"132 Randhurst Village Drive","city":"Mount Prospect","state":"IL","zip":"60056","country":"United States"},"contact":{"phone":"(847) 250-9560","email":"mtprospect@timemission.com"},"hours":{"mon":{"label":"12pm - 9pm"},"tue":{"label":"12pm - 9pm"},"wed":{"label":"12pm - 9pm"},"thu":{"label":"12pm - 9pm"},"fri":{"label":"12pm - Midnight"},"sat":{"label":"10am - Midnight"},"sun":{"label":"10am - 8pm"}},"mapUrl":"https://maps.google.com/?q=132+Randhurst+Village+Drive+Mount+Prospect+IL+60056","bookingUrl":"https://ecom.roller.app/timemissionmountprospect/onlinecheckout/en-us/products","giftCardUrl":"https://ecom.roller.app/timemissionmountprospect/onlinecheckout/en-us/giftcards"},
        'philadelphia':   {"name":"Time Mission Philadelphia","shortName":"Philadelphia","address":{"line1":"1530 Chestnut Street","city":"Philadelphia","state":"PA","zip":"19102","country":"United States"},"contact":{"phone":"(267) 710-1240","email":"philly@timemission.com"},"hours":{"mon":{"label":"12pm - 10pm"},"tue":{"label":"12pm - 10pm"},"wed":{"label":"12pm - 10pm"},"thu":{"label":"12pm - 10pm"},"fri":{"label":"12pm - 11pm"},"sat":{"label":"10am - 11pm"},"sun":{"label":"10am - 10pm"}},"mapUrl":"https://maps.google.com/?q=1530+Chestnut+Street+Philadelphia+PA+19102","bookingUrl":"https://tickets.timemission.com/onlinecheckout/en-us/products","giftCardUrl":"https://tickets.timemission.com/onlinecheckout/en-us/giftcards"},
        'west-nyack':     {"name":"Time Mission Palisades","shortName":"West Nyack","address":{"line1":"3532 Palisades Center Dr","line2":"Level 3","city":"West Nyack","state":"NY","zip":"10994","country":"United States"},"contact":{"phone":"(845) 328-4528","email":"palisades@timemission.com"},"hours":{"mon":{"label":"12pm - 9pm"},"tue":{"label":"12pm - 9pm"},"wed":{"label":"12pm - 9pm"},"thu":{"label":"12pm - 9pm"},"fri":{"label":"12pm - 11pm"},"sat":{"label":"10am - 11pm"},"sun":{"label":"10am - 8pm"}},"mapUrl":"https://maps.google.com/?q=3532+Palisades+Center+Dr+West+Nyack+NY+10994","bookingUrl":"https://tickets.timemission.com/onlinecheckout/en-us/products","giftCardUrl":"https://tickets.timemission.com/onlinecheckout/en-us/giftcards"},
        'lincoln':        {"name":"Time Mission Providence","shortName":"Lincoln","address":{"line1":"100 Higginson Ave","city":"Lincoln","state":"RI","zip":"02865","country":"United States"},"contact":{"phone":"(401) 721-5554","email":"info@r1indoorkarting.com"},"hours":{"mon":{"label":"12pm - 11pm"},"tue":{"label":"12pm - 11pm"},"wed":{"label":"12pm - 11pm"},"thu":{"label":"12pm - 11pm"},"fri":{"label":"12pm - Midnight"},"sat":{"label":"9am - Midnight"},"sun":{"label":"9am - 11pm"}},"mapUrl":"https://maps.google.com/?q=100+Higginson+Ave+Lincoln+RI+02865","bookingUrl":"https://tickets.timemission.com/onlinecheckout/en-us/products","giftCardUrl":"https://tickets.timemission.com/onlinecheckout/en-us/giftcards"},
        'manassas':       {"name":"Time Mission Manassas","shortName":"Manassas","address":{"line1":"8300 Sudley Rd","line2":"Unit A2","city":"Manassas","state":"VA","zip":"20109","country":"United States"},"contact":{"phone":"(571) 732-1050","email":"manassas@timemission.com"},"hours":{"mon":{"label":"12pm - 9pm"},"tue":{"label":"12pm - 9pm"},"wed":{"label":"12pm - 9pm"},"thu":{"label":"12pm - 9pm"},"fri":{"label":"12pm - Midnight"},"sat":{"label":"10am - Midnight"},"sun":{"label":"10am - 8pm"}},"mapUrl":"https://maps.google.com/?q=8300+Sudley+Rd+Manassas+VA+20109","bookingUrl":"https://ecom.roller.app/timemissionmanassasmall/onlinecheckout/en-us/products","giftCardUrl":"https://ecom.roller.app/timemissionmanassasmall/onlinecheckout/en-us/giftcards"},
        'antwerp':        {"name":"Experience Factory Antwerp","shortName":"Antwerp","address":{"line1":"Michiganstraat 1","city":"Antwerp","state":"","zip":"2030","country":"Belgium"},"contact":{"phone":"+32 3 301 03 03","email":"info@experience-factory.com"},"hours":{"mon":{"label":"2pm - 11pm"},"tue":{"label":"2pm - 11pm"},"wed":{"label":"2pm - 11pm"},"thu":{"label":"2pm - 11pm"},"fri":{"label":"2pm - 11pm"},"sat":{"label":"11am - 11pm"},"sun":{"label":"11am - 11pm"}},"mapUrl":"https://maps.google.com/?q=Michiganstraat+1+Antwerp+2030+Belgium","bookingUrl":"mailto:info@experience-factory.com?subject=Time%20Mission%20Antwerp%20Booking%20Request","giftCardUrl":"mailto:info@experience-factory.com?subject=Time%20Mission%20Antwerp%20Gift%20Card"},
        'houston':        { shortName: 'Houston',     bookingUrl: '', giftCardUrl: '/houston' },
        'orland-park':    { shortName: 'Orland Park', bookingUrl: '', giftCardUrl: '', mapUrl: 'https://maps.google.com/?q=66+Orland+Park+IL+60462' },
        'dallas':         { shortName: 'Dallas',      bookingUrl: '', giftCardUrl: '', mapUrl: 'https://maps.google.com/?q=Dallas+TX' },
        'brussels':       { shortName: 'Brussels',    bookingUrl: '', giftCardUrl: '', mapUrl: 'https://maps.google.com/?q=Av.+Imp%C3%A9ratrice+Charlotte+1020+Bruxelles+Belgium' }
    };

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

    function normalizeLocationId(value) {
        return String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
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
        const source = TM.locations.length ? TM.locations : Object.keys(FALLBACK).map((id) => {
            return Object.assign({ id: id, slug: id }, FALLBACK[id]);
        });
        return source.map((loc) => ({
            value: loc.id,
            label: (loc.shortName || loc.name || loc.id) + (loc.status === 'coming-soon' ? ' (Coming Soon)' : ''),
            status: loc.status || 'open',
        }));
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
                // Append version-bump so CDN/browser cache doesn't serve stale data.
                // Update this string whenever data/locations.json changes.
                const versioned = url + (url.includes('?') ? '&' : '?') + 'v=8';
                const res = await fetch(versioned);
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
            document.dispatchEvent(new CustomEvent('tm:location-changed', { detail: loc }));
            if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
                window.TMAnalytics.track('location_select', {
                    location_slug: loc.slug || loc.id,
                    region: loc.region || '',
                });
            }
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
                // Primary key (slug)
                let saved = localStorage.getItem(STORAGE_KEY);
                // Fallback — legacy/nav.js key stores display name ("Philadelphia")
                if (!saved) {
                    const legacy = localStorage.getItem('timeMissionLocation');
                    if (legacy) saved = legacy.toLowerCase().replace(/\s+/g, '-');
                }
                if (saved) {
                    const loc = TM.get(saved);
                    if (loc) {
                        TM.current = loc;
                        // Heal the canonical key for next time
                        try { localStorage.setItem(STORAGE_KEY, loc.id); } catch (e) {}
                        return;
                    }
                    // If locations.json didn't load (e.g. file:// protocol),
                    // build a synthetic current from the embedded fallback so
                    // active-state highlighting and the Tickets button still work.
                    if (TM.locations.length === 0 && FALLBACK[saved]) {
                        TM.current = Object.assign({ id: saved, slug: saved }, FALLBACK[saved]);
                        try { localStorage.setItem(STORAGE_KEY, saved); } catch (e) {}
                        return;
                    }
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
                const changeEl = infoPanel.querySelector('.footer-loc-change');

                if (nameEl) nameEl.textContent = loc.name || loc.shortName || '';
                if (addrEl) addrEl.innerHTML = formatAddress(loc.address);
                if (phoneEl && loc.contact && loc.contact.phone) {
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
        select(id) {
            if (typeof TM.select === 'function') TM.select(id);
        },
        clear() {
            if (typeof TM.clear === 'function') TM.clear();
        },
        resolveBookingUrl(kind, id) {
            const loc = id ? (typeof TM.get === 'function' ? TM.get(id) : null) : TM.current;
            if (!loc) return '';
            const bookingKind = String(kind || 'tickets').toLowerCase();
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
