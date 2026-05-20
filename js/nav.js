// ==========================================
// SHARED NAVIGATION JS
// Mobile menu toggle, location picker, scroll effect
// ==========================================

(function() {
    function normalizeLocation(value) {
        const context = getLocationContext();
        if (context && typeof context.normalizeSlug === 'function') {
            return context.normalizeSlug(value);
        }
        return (value || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

    function getLocationContext() {
        if (window.LocationContext) return window.LocationContext;
        if (!window.TM) return null;
        return {
            ready: window.TM.ready,
            getCurrent: function() { return window.TM.current || null; },
            getSavedSlug: typeof window.TM.getSavedSlug === 'function' ? window.TM.getSavedSlug.bind(window.TM) : function () { return ''; },
            getOverlayView: typeof window.TM.getOverlayView === 'function' ? window.TM.getOverlayView.bind(window.TM) : null,
            applyBookingCtaView: typeof window.TM.applyBookingCtaView === 'function' ? window.TM.applyBookingCtaView.bind(window.TM) : null,
            normalizeSlug: typeof window.TM.normalizeSlug === 'function' ? window.TM.normalizeSlug.bind(window.TM) : null,
            isIndexPath: typeof window.TM.isIndexPath === 'function' ? window.TM.isIndexPath.bind(window.TM) : null,
            subscribe: typeof window.TM.onChange === 'function' ? window.TM.onChange.bind(window.TM) : null,
            select: function (slug, opts) {
                if (typeof window.TM.select === 'function') window.TM.select(slug, opts);
            }
        };
    }

    function translate(key, fallback, replacements) {
        if (window.TMI18n && typeof window.TMI18n.text === 'function') {
            return window.TMI18n.text(key, fallback, replacements);
        }
        let value = fallback;
        Object.keys(replacements || {}).forEach(function (token) {
            value = String(value || '').replace(new RegExp('\\{' + token + '\\}', 'g'), replacements[token]);
        });
        return value;
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
    const LOCATION_SCOPED_PATHS = [
        '/',
        '/about',
        '/missions',
        '/groups',
        '/groups/bachelor-ette',
        '/groups/birthdays',
        '/groups/corporate',
        '/groups/field-trips',
        '/groups/holidays',
        '/groups/private-events',
        '/gift-cards',
        '/faq',
        '/contact',
        '/contact-thank-you',
        '/locations',
        '/privacy',
        '/terms',
        '/code-of-conduct',
        '/cookies',
        '/accessibility',
        '/licensing',
        '/waiver',
    ];

    function safeDecode(value) {
        try {
            return decodeURIComponent(String(value || ''));
        } catch (e) {
            return String(value || '');
        }
    }

    function trimTrailingSlash(pathname) {
        return pathname.replace(/\/+$/, '') || '/';
    }

    function normalizeHrefPath(pathname) {
        const clean = String(pathname || '/').startsWith('/') ? String(pathname || '/') : '/' + String(pathname || '');
        return trimTrailingSlash(clean.replace(/\/+/g, '/'));
    }

    function compactPath(value) {
        return normalizeHrefPath(safeDecode(value)).toLowerCase().replace(/\.html$/i, '').replace(/-/g, '');
    }

    const scopedPathByCompact = LOCATION_SCOPED_PATHS.reduce(function (map, path) {
        map[compactPath(path)] = path;
        map[compactPath(path + '.html')] = path;
        return map;
    }, {});

    function compactLocation(value) {
        return safeDecode(value).toLowerCase().trim().replace(/\.html$/i, '').replace(/-/g, '');
    }

    function getCurrentLocationSlug() {
        const context = getLocationContext();
        const loc = context && typeof context.getCurrent === 'function' ? context.getCurrent() : null;
        if (!loc) return '';
        return normalizeLocation(loc.slug || loc.id || loc.shortName || loc.name || '');
    }

    function isKnownLocationPath(pathname) {
        const firstSegment = normalizeHrefPath(pathname).split('/')[1] || '';
        if (!firstSegment) return false;
        const compactSegment = compactLocation(firstSegment);
        const known = (window.TM && Array.isArray(window.TM.locations)) ? window.TM.locations : [];
        return known.some(function (loc) {
            return compactLocation(loc.id) === compactSegment
                || compactLocation(loc.slug) === compactSegment
                || compactLocation(loc.shortName) === compactSegment
                || compactLocation(loc.name) === compactSegment;
        });
    }

    function getScopedCanonicalPath(pathname) {
        return scopedPathByCompact[compactPath(pathname)] || '';
    }

    function getPathWithoutLocationPrefix(pathname) {
        const normalized = normalizeHrefPath(pathname);
        const parts = normalized.split('/').filter(Boolean);
        if (!parts.length) return '/';
        const compactFirst = compactLocation(parts[0]);
        const known = (window.TM && Array.isArray(window.TM.locations)) ? window.TM.locations : [];
        const firstIsLocation = known.some(function (loc) {
            return compactLocation(loc.id) === compactFirst
                || compactLocation(loc.slug) === compactFirst
                || compactLocation(loc.shortName) === compactFirst
                || compactLocation(loc.name) === compactFirst;
        });
        if (!firstIsLocation) return normalized;
        return parts.length > 1 ? '/' + parts.slice(1).join('/') : '/';
    }

    function currentScopedCanonicalPath() {
        const withoutLocation = getPathWithoutLocationPrefix(window.location.pathname || '/');
        return getScopedCanonicalPath(withoutLocation);
    }

    function currentSearchForLocationSelection(slug) {
        const raw = (window.location && window.location.search) || '';
        if (!raw) return '';
        const params = new URLSearchParams(raw);
        if (params.has('location')) params.set('location', slug);
        const query = params.toString();
        return query ? '?' + query : '';
    }

    function appendTrackingToExternalLocation(href) {
        const journey = window.TMBookingJourney;
        if (journey && typeof journey.appendTrackingParams === 'function') {
            return journey.appendTrackingParams(href);
        }
        return href;
    }

    function locationSelectionHref(slug) {
        const normalized = normalizeLocation(slug);
        if (!normalized) return '';
        const canonicalPath = currentScopedCanonicalPath();
        const destinationPath = canonicalPath
            ? (canonicalPath === '/' ? '/' + normalized : '/' + normalized + canonicalPath)
            : '/' + normalized;
        return destinationPath + currentSearchForLocationSelection(normalized) + ((window.location && window.location.hash) || '');
    }

    function syncLocationSelectionLinks() {
        if (!locationLinks || !locationLinks.length) return;
        locationLinks.forEach(function (link) {
            if (isExternalLocationLink(link)) {
                const href = link.getAttribute('data-tm-location-base-href') || link.getAttribute('href') || '';
                if (href && !link.getAttribute('data-tm-location-base-href')) {
                    link.setAttribute('data-tm-location-base-href', href);
                }
                link.setAttribute('href', appendTrackingToExternalLocation(href));
                return;
            }
            const slug = getLocationSlug(link);
            const href = locationSelectionHref(slug);
            if (href) {
                if (!link.getAttribute('data-tm-location-base-href')) {
                    link.setAttribute('data-tm-location-base-href', link.getAttribute('href') || href);
                }
                link.setAttribute('href', href);
            }
        });
    }

    function shouldSkipLocationScopedLink(link, url) {
        if (!link || !url) return true;
        const rawHref = (link.getAttribute('href') || '').trim();
        if (!rawHref || rawHref.charAt(0) === '#') return true;
        if (/^(mailto|tel|sms|javascript):/i.test(rawHref)) return true;
        if (url.origin !== window.location.origin) return true;
        if (link.hasAttribute('download')) return true;
        const target = (link.getAttribute('target') || '').toLowerCase();
        if (target && target !== '_self') return true;
        if (link.dataset && (link.dataset.tmNoLocationScope || link.dataset.city || link.dataset.tmLocationSlug)) return true;
        if (link.hasAttribute('data-tm-href') || link.hasAttribute('data-tm-booking-kind')) return true;
        if (link.classList && (
            link.classList.contains('btn-tickets')
            || link.classList.contains('btn-book-now')
            || link.classList.contains('footer-loc-map')
            || link.classList.contains('footer-loc-phone')
            || link.classList.contains('location-info-book')
        )) return true;
        if (typeof link.closest === 'function' && link.closest('.footer-location-list')) return true;
        const pathname = normalizeHrefPath(url.pathname);
        if (/^\/(assets|css|data|fonts|js|api|c)\b/i.test(pathname)) return true;
        if (/^\/(_headers|_redirects|favicon\.ico|license\.xml|robots\.txt|sitemap\.xml|llms\.txt|ai-context\.md|pricing\.md)$/i.test(pathname)) return true;
        return isKnownLocationPath(pathname);
    }

    function updateLocationScopedLinks() {
        const slug = getCurrentLocationSlug();
        document.querySelectorAll('a[href]').forEach(function (link) {
            let baseHref = link.getAttribute('data-tm-location-base-href') || link.getAttribute('href') || '';

            let url;
            try {
                url = new URL(baseHref, window.location.origin);
            } catch (e) {
                return;
            }

            if (shouldSkipLocationScopedLink(link, url)) {
                return;
            }

            if (!link.getAttribute('data-tm-location-base-href')) {
                link.setAttribute('data-tm-location-base-href', baseHref);
            }

            const canonicalPath = getScopedCanonicalPath(url.pathname);
            if (!slug || !canonicalPath) {
                link.setAttribute('href', baseHref);
                return;
            }

            const scopedPath = canonicalPath === '/' ? '/' + slug : '/' + slug + canonicalPath;
            link.setAttribute('href', scopedPath + url.search + url.hash);
        });
    }

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

    function syncLocationDisplay(city) {
        const mainLocText = document.getElementById('locationText');
        if (mainLocText) mainLocText.textContent = city;
        if (window.updateEyebrowLocation) window.updateEyebrowLocation(city);
    }

    function syncAllLocations(city, slug, selectOpts) {
        const normalized = normalizeLocation(slug || city);
        syncLocationDisplay(city);
        const context = getLocationContext();
        if (context && typeof context.select === 'function') {
            context.select(normalized, selectOpts);
        }
        updateLocationScopedLinks();
    }

    // Navigation scroll effect
    if (navEl) {
        let scrollTicking = false;
        let navScrolled = navEl.classList.contains('scrolled');
        function syncNavScrollState() {
            const shouldBeScrolled = window.scrollY > 50;
            if (shouldBeScrolled !== navScrolled) {
                navScrolled = shouldBeScrolled;
                navEl.classList.toggle('scrolled', shouldBeScrolled);
            }
            scrollTicking = false;
        }
        window.addEventListener('scroll', () => {
            if (scrollTicking) return;
            scrollTicking = true;
            requestAnimationFrame(syncNavScrollState);
        }, { passive: true });
        syncNavScrollState();
    }

    // Location overlay toggle and selection
    const locationBtn = document.getElementById('locationBtn');
    const locationOverlay = document.getElementById('locationDropdown');
    const locationLinks = locationOverlay ? locationOverlay.querySelectorAll('a') : [];
    const narrowPickerQuery = window.matchMedia('(max-width: 768px)');

    if (locationBtn && locationOverlay) {
        function openLocationOverlay() {
            syncLocationSelectionLinks();
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
                if (narrowPickerQuery.matches) return;
                const slug = getLocationSlug(link);
                if (slug) showLocationInfo(slug);
            });

            link.addEventListener('click', (e) => {
                syncLocationSelectionLinks();
                const cityName = link.dataset.city;
                const slug = getLocationSlug(link);
                if (cityName && !isExternalLocationLink(link)) {
                    if (!isSameWindowNavigationClick(e, link)) {
                        closeLocationOverlay();
                        return;
                    }

                    const overlayTrack = slug ? { cta_id: 'nav_location_overlay' } : undefined;
                    syncAllLocations(cityName, slug, overlayTrack);
                }

                // Non-location overlay links or modifier clicks: close overlay and let the browser follow href.
                closeLocationOverlay();
            });
        });
    }

    function getLocationSlug(link) {
        if (link && link.dataset && link.dataset.tmLocationSlug) return link.dataset.tmLocationSlug;
        const href = (link && (link.getAttribute('data-tm-location-base-href') || link.getAttribute('href')) || '').trim();
        if (!href) return '';
        if (isExternalLocationLink(link)) return '';
        let pathname = href;
        try {
            pathname = new URL(href, window.location.origin).pathname;
        } catch (e) {
            pathname = href.split('#')[0].split('?')[0];
        }
        return pathname
            .replace(/^(\.\/|\.\.\/)+/, '')
            .replace(/^\//, '')
            .replace(/\.html$/, '');
    }

    function isExternalLocationLink(link) {
        if (!link) return false;
        if (link.dataset && link.dataset.tmExternalLocation === 'true') return true;
        const href = (link.getAttribute('href') || '').trim();
        if (!href || !/^https?:\/\//i.test(href)) return false;
        try {
            return new URL(href, window.location.origin).origin !== window.location.origin;
        } catch (e) {
            return true;
        }
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
        if (!context || typeof context.getOverlayView !== 'function' || !details) return;

        const overlayView = context.getOverlayView(locationRef);
        if (!overlayView || !overlayView.location) return;
        const data = overlayView.location;
        activeLocationInfoRef = locationRef;

        infoPanel.querySelector('.location-info-name').textContent = data.name;
        const addrEl = infoPanel.querySelector('.location-info-address');
        setAddressText(addrEl, data.addressText, data.name);
        addrEl.href = data.mapDirectionsUrl || '#';
        infoPanel.querySelector('.location-info-phone').textContent = data.phone;
        setMultilineText(infoPanel.querySelector('.location-info-hours'), translateHoursText(data.hoursText));
        var bookBtn = infoPanel.querySelector('.location-info-book');
        if (bookBtn) {
            bookBtn.textContent = translate(overlayView.bookLabelKey, overlayView.bookLabelFallback);
            if (context && typeof context.applyBookingCtaView === 'function') {
                context.applyBookingCtaView(bookBtn, overlayView.cta);
            }
        }

        renderMapEmbed(mapEl, data.mapEmbedUrl);

        if (empty) empty.style.display = 'none';
        details.style.display = 'block';
    }

    function syncNavLocationState(loc) {
        const mainLocText = document.getElementById('locationText');
        if (mainLocText && loc && (loc.shortName || loc.name)) {
            mainLocText.textContent = loc.shortName || loc.name;
        }
        if (loc && (loc.id || loc.slug)) {
            showLocationInfo(loc.id || loc.slug);
        }
        updateLocationScopedLinks();
    }

    const navLoadContext = getLocationContext();
    if (navLoadContext && navLoadContext.ready && typeof navLoadContext.ready.then === 'function') {
        navLoadContext.ready.then(function () {
            const cur = typeof navLoadContext.getCurrent === 'function' ? navLoadContext.getCurrent() : null;
            syncNavLocationState(cur);
        });
    }

    if (navLoadContext && typeof navLoadContext.subscribe === 'function') {
        navLoadContext.subscribe(function (loc) {
            syncNavLocationState(loc);
        });
    }

    document.addEventListener('tm:locations-ready', function (event) {
        syncNavLocationState(event.detail || null);
    });

    document.addEventListener('tm:location-changed', function (event) {
        syncNavLocationState(event.detail || null);
    });

    document.addEventListener('tm:language-changed', function () {
        if (activeLocationInfoRef) showLocationInfo(activeLocationInfoRef);
    });
})();
