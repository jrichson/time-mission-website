// ==========================================
// SHARED NAVIGATION JS
// Mobile menu toggle, location picker, scroll effect
// ==========================================

(function() {
    function normalizeLocation(value) {
        if (window.TM && typeof window.TM.normalizeSlug === 'function') {
            return window.TM.normalizeSlug(value);
        }
        return (value || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

    function pathIsHomeIndex() {
        if (window.TM && typeof window.TM.isIndexPath === 'function') {
            return window.TM.isIndexPath();
        }
        const p = window.location.pathname;
        return p === '/' || p.endsWith('/index.html') || p.endsWith('/index.htm');
    }

    function getLocationContext() {
        if (window.LocationContext) return window.LocationContext;
        if (!window.TM) return null;
        return {
            ready: window.TM.ready,
            getCurrent: function() { return window.TM.current || null; },
            select: function (slug, opts) {
                if (typeof window.TM.select === 'function') window.TM.select(slug, opts);
            }
        };
    }

    function formatTranslation(value, replacements) {
        let output = String(value || '');
        Object.keys(replacements || {}).forEach(function (key) {
            output = output.replace(new RegExp('\\{' + key + '\\}', 'g'), replacements[key]);
        });
        return output;
    }

    function translate(key, fallback, replacements) {
        let value = fallback;
        if (window.TMI18n && typeof window.TMI18n.t === 'function') {
            const translated = window.TMI18n.t(key);
            if (typeof translated === 'string') value = translated;
        }
        return formatTranslation(value, replacements);
    }

    function translateHoursText(value) {
        const raw = String(value || '');
        if (!raw) return '';
        if (raw === 'Coming Soon') return translate('location.comingSoon', 'Coming Soon');

        const dayKeys = {
            Mon: 'location.day.mon',
            Tue: 'location.day.tue',
            Wed: 'location.day.wed',
            Thu: 'location.day.thu',
            Fri: 'location.day.fri',
            Sat: 'location.day.sat',
            Sun: 'location.day.sun',
        };
        return raw.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun):/gm, function (match, day) {
            return translate(dayKeys[day], day) + ':';
        });
    }

    function setAddressText(el, value, locationName) {
        if (!el) return;
        el.textContent = '';
        String(value || '').split('\n').forEach(function (line, index) {
            if (index > 0) el.appendChild(document.createElement('br'));
            el.appendChild(document.createTextNode(line));
        });
        const directions = document.createElement('span');
        directions.className = 'location-info-directions';
        directions.setAttribute('data-i18n', 'location.getDirections');
        directions.textContent = translate('location.getDirections', 'Get Directions ↗');
        el.appendChild(directions);
        el.setAttribute('aria-label', translate(
            'location.getDirectionsTo',
            'Get directions to {location}',
            { location: locationName || translate('location.selectedLocation', 'your selected location') }
        ));
    }

    const menuBtn = document.querySelector('.nav-menu-btn');
    const mobileMenu = document.getElementById('mobileMenu');
    const navEl = document.getElementById('nav');
    let activeLocationInfoRef = '';

    // Logo — if a location is saved, route home to that location's page.
    // Reads canonical slug via TM.getSavedSlug() so the legacy key is migrated
    // once and we never duplicate the storage-key knowledge here (RFC #11).
    document.querySelectorAll('.nav-logo, .location-dropdown-logo').forEach(logo => {
        logo.addEventListener('click', function (e) {
            const context = getLocationContext();
            const current = context && typeof context.getCurrent === 'function' ? context.getCurrent() : null;
            let slug = (current && (current.slug || current.id)) || '';
            if (!slug && window.TM && typeof window.TM.getSavedSlug === 'function') {
                slug = window.TM.getSavedSlug();
            }
            if (!slug) return; // no location — let the default index.html link work
            e.preventDefault();
            const inSubdir = window.location.pathname.includes('/locations/') || window.location.pathname.includes('/groups/');
            window.location.href = (inSubdir ? '../' : '/') + slug;
        });
    });

    // Mobile menu toggle
    const tickerBar = document.querySelector('.ticker-bar');

    if (menuBtn && mobileMenu && navEl) {
        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('open');
            navEl.classList.toggle('menu-open');
            if (tickerBar) tickerBar.classList.toggle('menu-hidden');
            document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
        });

        // Close menu when clicking a nav link
        mobileMenu.querySelectorAll('.mobile-menu-links a').forEach(link => {
            link.addEventListener('click', () => {
                menuBtn.classList.remove('active');
                navEl.classList.remove('menu-open');
                mobileMenu.classList.remove('open');
                if (tickerBar) tickerBar.classList.remove('menu-hidden');
                document.body.style.overflow = '';
            });
        });
    }

    // Helper to sync all location displays. RFC #11: nav no longer writes
    // localStorage directly — TM.select is the sole writer of the canonical
    // 'tm_location' key. The legacy 'timeMissionLocation' key is migrate-only
    // (TM.getSavedSlug / TM.restore heal it once and remove it).
    function syncAllLocations(city, slug, selectOpts) {
        const normalized = normalizeLocation(slug || city);
        const mainLocText = document.getElementById('locationText');
        if (mainLocText) mainLocText.textContent = city;
        const context = getLocationContext();
        if (context && typeof context.select === 'function') {
            context.select(normalized, selectOpts);
        }
        // Update hero eyebrow on mobile (function exposed by index.html)
        if (window.updateEyebrowLocation) window.updateEyebrowLocation(city);
    }

    // Navigation scroll effect
    if (navEl) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navEl.classList.add('scrolled');
            } else {
                navEl.classList.remove('scrolled');
            }
        });
    }

    // Location overlay toggle and selection
    const locationBtn = document.getElementById('locationBtn');
    const locationOverlay = document.getElementById('locationDropdown');
    const locationLinks = locationOverlay ? locationOverlay.querySelectorAll('a') : [];
    const narrowPickerQuery = window.matchMedia('(max-width: 768px)');

    if (locationBtn && locationOverlay) {
        function openLocationOverlay() {
            locationOverlay.classList.add('open');
            if (navEl) navEl.classList.add('location-open');
            // Defer scroll lock so it doesn't interrupt the overlay's fade-in transition
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    document.body.style.overflow = 'hidden';
                });
            });
        }
        function closeLocationOverlay() {
            locationOverlay.classList.remove('open');
            if (navEl) navEl.classList.remove('location-open');
            document.body.style.overflow = '';
        }

        locationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openLocationOverlay();
        });

        // Close button
        const closeBtn = locationOverlay.querySelector('.location-dropdown-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeLocationOverlay();
            });
        }

        // Close on clicking overlay background (not content)
        locationOverlay.addEventListener('click', (e) => {
            if (e.target === locationOverlay) {
                closeLocationOverlay();
            }
        });

        // Handle location selection
        locationLinks.forEach(link => {
            // Show info panel on hover (desktop) and click
            link.addEventListener('mouseenter', () => {
                const slug = getLocationSlug(link);
                if (slug) showLocationInfo(slug);
            });

            link.addEventListener('click', (e) => {
                const cityName = link.dataset.city;
                const slug = getLocationSlug(link);
                const narrowPicker = narrowPickerQuery.matches;
                const isComingSoonLink = link.classList.contains('location-coming-soon');

                if (cityName) {
                    const overlayTrack = slug ? { cta_id: 'nav_location_overlay' } : undefined;
                    syncAllLocations(cityName, slug, overlayTrack);
                    showLocationInfo(slug || cityName);
                }

                // Mobile narrow-picker (P0-7a): keep overlay open, reveal #locationInfo, scroll it into view.
                // Coming-soon links bypass this and navigate normally so users still see the coming-soon page.
                if (narrowPicker && slug && !isComingSoonLink) {
                    e.preventDefault();
                    // Stop bubble to overlay-background click handler which would call closeLocationOverlay()
                    e.stopPropagation();
                    const panel = document.getElementById('locationInfo');
                    if (panel) {
                        requestAnimationFrame(function () {
                            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        });
                    }
                    return;
                }

                // Same-window location navigation: keep the overlay covering the old page
                // until the destination loads so users do not see a selected-location flash.
                if (cityName && isSameWindowNavigationClick(e, link)) {
                    locationOverlay.classList.add('navigating');
                    return;
                }

                // Non-location overlay links or modifier clicks: close overlay and let the browser follow href.
                closeLocationOverlay();
            });
        });
    }

    function getLocationSlug(link) {
        return (link.getAttribute('href') || '').replace(/^\//, '').replace(/\.html$/, '');
    }

    function isSameWindowNavigationClick(event, link) {
        if (!link || event.defaultPrevented || event.button !== 0) return false;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
        const target = (link.getAttribute('target') || '').toLowerCase();
        return !target || target === '_self';
    }

    function setMultilineText(el, value) {
        if (!el) return;
        el.textContent = String(value || '');
        el.style.whiteSpace = 'pre-line';
    }

    function renderMapEmbed(target, embedUrl) {
        if (!target) return;
        target.textContent = '';
        if (!embedUrl) {
            target.style.display = 'none';
            return;
        }
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.loading = 'lazy';
        iframe.referrerPolicy = 'no-referrer-when-downgrade';
        iframe.title = 'Map';
        target.appendChild(iframe);
        target.style.display = 'block';
    }

    // Show location info in overlay panel
    function showLocationInfo(locationRef) {
        const infoPanel = document.getElementById('locationInfo');
        if (!infoPanel) return;
        const empty = infoPanel.querySelector('.location-info-empty');
        const details = infoPanel.querySelector('.location-info-details');
        const mapEl = document.getElementById('locationMap');
        const context = getLocationContext();
        if (!context || typeof context.getInfoPanelView !== 'function' || !details) {
            // getInfoPanelView missing — LocationContext not fully initialized yet.
            // Surface this in dev so the silent-empty-panel symptom is debuggable.
            if (context && typeof context.getInfoPanelView !== 'function') {
                console.warn('nav.js: showLocationInfo skipped — context.getInfoPanelView is not a function');
            }
            return;
        }

        const data = context.getInfoPanelView(locationRef);
        if (!data) return;
        activeLocationInfoRef = locationRef;

        infoPanel.querySelector('.location-info-name').textContent = data.name;
        const addrEl = infoPanel.querySelector('.location-info-address');
        setAddressText(addrEl, data.addressText, data.name);
        addrEl.href = data.mapDirectionsUrl || '#';
        infoPanel.querySelector('.location-info-phone').textContent = data.phone;
        setMultilineText(infoPanel.querySelector('.location-info-hours'), translateHoursText(data.hoursText));
        var bookBtn = infoPanel.querySelector('.location-info-book');
        bookBtn.href = data.bookUrl || data.pageUrl || '#';
        bookBtn.textContent = data.comingSoon
            ? translate('location.signUp', 'Sign Up')
            : translate('nav.bookNow', data.bookLabel || 'Book Now');

        renderMapEmbed(mapEl, data.mapEmbedUrl);

        var pageTour = infoPanel.querySelector('.location-info-page');
        if (pageTour && data.pageUrl) {
            pageTour.href = data.pageUrl;
            pageTour.hidden = !!data.comingSoon;
            var visitLabel = data.shortName || data.name;
            pageTour.textContent = visitLabel
                ? translate('location.visitLocation', 'Visit {location}', { location: visitLabel })
                : translate('location.visitVenue', 'Visit venue');
            pageTour.setAttribute(
                'aria-label',
                data.name
                    ? translate('location.openVenuePageName', 'Open venue landing page — {location}', { location: data.name })
                    : translate('location.openVenuePage', 'Open venue landing page')
            );
        }

        if (empty) empty.style.display = 'none';
        details.style.display = 'block';
    }

    const navLoadContext = getLocationContext();
    if (navLoadContext && navLoadContext.ready && typeof navLoadContext.ready.then === 'function') {
        navLoadContext.ready.then(function () {
            if (locationBtn && locationOverlay && !pathIsHomeIndex()) {
                const cur = typeof navLoadContext.getCurrent === 'function' ? navLoadContext.getCurrent() : null;
                if (cur && cur.shortName) {
                    syncAllLocations(cur.shortName, cur.slug || cur.id);
                }
            }
            const cur = typeof navLoadContext.getCurrent === 'function' ? navLoadContext.getCurrent() : null;
            if (cur && (cur.id || cur.slug)) {
                showLocationInfo(cur.id || cur.slug);
            }
        });
    }

    // RFC #11: Subscribe to TM changes to keep nav dropdown in sync.
    // Additive to the existing tm:location-changed CustomEvent path, not a
    // replacement — both deliver after TM.select runs.
    if (window.TM && typeof window.TM.onChange === 'function') {
        window.TM.onChange(function (loc) {
            const mainLocText = document.getElementById('locationText');
            if (mainLocText && loc && (loc.shortName || loc.name)) {
                mainLocText.textContent = loc.shortName || loc.name;
            }
            if (loc && (loc.id || loc.slug)) {
                showLocationInfo(loc.id || loc.slug);
            }
        });
    }

    document.addEventListener('tm:language-changed', function () {
        if (activeLocationInfoRef) showLocationInfo(activeLocationInfoRef);
    });
})();
