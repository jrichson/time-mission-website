// ==========================================
// SHARED NAVIGATION JS
// Mobile menu toggle, location picker, scroll effect
// ==========================================

(function() {
    const siteProfile = window.__TM_SITE_PROFILE__ || {};

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

    function localizedLocationName(loc, fallback) {
        const slug = normalizeLocation(loc && (loc.slug || loc.id));
        return slug ? translate('location.name.' + slug, fallback) : fallback;
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

    function locationScopedPaths() {
        const contract = window.__TM_SITE_CONTRACT__ || {};
        const runtime = contract.runtime || {};
        return Array.isArray(runtime.locationScopedPaths) ? runtime.locationScopedPaths : [];
    }

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

    const scopedPathByCompact = locationScopedPaths().reduce(function (map, path) {
        map[compactPath(path)] = path;
        map[compactPath(path + '.html')] = path;
        return map;
    }, {});

    function compactLocation(value) {
        return safeDecode(value).toLowerCase().trim().replace(/\.html$/i, '').replace(/-/g, '');
    }

    function localizedPathContext(pathname) {
        const normalized = normalizeHrefPath(pathname);
        if (!siteProfile.localizedRoutes) {
            return { localePrefix: '', pathname: normalized };
        }

        const supportedLocales = Array.isArray(siteProfile.locales) ? siteProfile.locales : [];
        const defaultLocale = String(siteProfile.defaultLocale || supportedLocales[0] || 'en').toLowerCase();
        const parts = normalized.split('/').filter(Boolean);
        const firstSegment = String(parts[0] || '').toLowerCase();
        const matchedLocale = supportedLocales.find(function (locale) {
            return String(locale || '').toLowerCase() === firstSegment;
        });
        if (!matchedLocale || firstSegment === defaultLocale) {
            return { localePrefix: '', pathname: normalized };
        }

        const unprefixedPath = parts.length > 1 ? '/' + parts.slice(1).join('/') : '/';
        return {
            localePrefix: '/' + String(matchedLocale).toLowerCase(),
            pathname: unprefixedPath,
        };
    }

    function getCurrentLocationSlug() {
        const context = getLocationContext();
        const loc = context && typeof context.getCurrent === 'function' ? context.getCurrent() : null;
        if (!loc) return '';
        if (loc.externalUrl) return '';
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
        const localizedPath = localizedPathContext(window.location.pathname || '/');
        if (window.TMNavigation) {
            const path = getPathWithoutLocationPrefix(localizedPath.pathname);
            const policy = (window.__TM_SITE_CONTRACT__.runtime || {}).navigation || {};
            if ((policy.dynamicSharedPrefixes || []).some(prefix => path.startsWith(prefix + '/'))) return path;
            return getScopedCanonicalPath(path);
        }
        if (siteProfile.localizedRoutes
            && localizedPath.localePrefix
            && !isKnownLocationPath(localizedPath.pathname)) {
            return '';
        }
        const withoutLocation = getPathWithoutLocationPrefix(localizedPath.pathname);
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
        const localizedPath = localizedPathContext(window.location.pathname || '/');
        const canonicalPath = currentScopedCanonicalPath();
        const destinationPath = canonicalPath
            ? (canonicalPath === '/' ? '/' + normalized : '/' + normalized + canonicalPath)
            : '/' + normalized;
        return localizedPath.localePrefix
            + destinationPath
            + currentSearchForLocationSelection(normalized)
            + ((window.location && window.location.hash) || '');
    }

    function syncLocationSelectionLinks() {
        const links = getLocationLinks();
        if (!links.length) return;
        links.forEach(function (link) {
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
        if (link.hasAttribute('data-tm-no-location-scope')) return true;
        if (link.dataset && (link.dataset.city || link.dataset.tmLocationSlug)) return true;
        if (link.hasAttribute('data-tm-href') || link.hasAttribute('data-tm-booking-kind')) return true;
        if (link.classList && (
            link.classList.contains('btn-tickets')
            || link.classList.contains('btn-book-now')
            || link.classList.contains('footer-loc-map')
            || link.classList.contains('footer-loc-phone')
            || link.classList.contains('location-info-book')
        )) return true;
        if (typeof link.closest === 'function' && link.closest('.footer-location-list')) return true;
        const pathname = localizedPathContext(url.pathname).pathname;
        if (/^\/(assets|css|data|fonts|js|api|c)\b/i.test(pathname)) return true;
        if (/^\/(_headers|_redirects|favicon\.ico|license\.xml|robots\.txt|sitemap\.xml|llms\.txt|ai-context\.md|pricing\.md)$/i.test(pathname)) return true;
        return isKnownLocationPath(pathname);
    }

    function updateLocationScopedLinks() {
        if (window.TMNavigation) {
            window.TMNavigation.refresh();
            return;
        }
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

            const localizedPath = localizedPathContext(url.pathname);
            const canonicalPath = getScopedCanonicalPath(localizedPath.pathname);
            if (!slug || !canonicalPath) {
                link.setAttribute('href', baseHref);
                return;
            }

            const scopedPath = canonicalPath === '/' ? '/' + slug : '/' + slug + canonicalPath;
            const localePrefix = localizedPathContext(window.location.pathname || '/').localePrefix;
            link.setAttribute('href', localePrefix + scopedPath + url.search + url.hash);
        });
    }

    // Mobile menu toggle
    const tickerBar = document.querySelector('.ticker-bar');
    const utilityBar = document.querySelector('.utility-bar');

    if (menuBtn && mobileMenu && navEl) {
        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('open');
            navEl.classList.toggle('menu-open');
            if (tickerBar) tickerBar.classList.toggle('menu-hidden');
            if (utilityBar) utilityBar.classList.toggle('menu-hidden');
            document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
        });

        // Close menu when clicking a nav link
        mobileMenu.querySelectorAll('.mobile-menu-links a').forEach(link => {
            link.addEventListener('click', () => {
                menuBtn.classList.remove('active');
                navEl.classList.remove('menu-open');
                mobileMenu.classList.remove('open');
                if (tickerBar) tickerBar.classList.remove('menu-hidden');
                if (utilityBar) utilityBar.classList.remove('menu-hidden');
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
    const narrowPickerQuery = window.matchMedia('(max-width: 768px)');

    function getLocationLinks() {
        return locationOverlay ? Array.from(locationOverlay.querySelectorAll('a')) : [];
    }

    function getLocationLinkFromEvent(target) {
        const link = target && typeof target.closest === 'function' ? target.closest('a') : null;
        if (!link || !locationOverlay || !locationOverlay.contains(link)) return null;
        return link;
    }

    if (locationBtn && locationOverlay) {
        function openLocationOverlay() {
            locationOverlay.classList.add('open');
            sortLocationsByDistance();
            if (navEl) navEl.classList.add('location-open');
            requestAnimationFrame(syncLocationSelectionLinks);
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

        // Handle hydrated location links through delegation; the link list can change after locations load.
        locationOverlay.addEventListener('mouseover', (e) => {
            if (narrowPickerQuery.matches) return;
            const link = getLocationLinkFromEvent(e.target);
            const slug = getLocationSlug(link);
            if (slug) showLocationInfo(slug);
        });

        locationOverlay.addEventListener('click', (e) => {
            const link = getLocationLinkFromEvent(e.target);
            if (!link) return;

            syncLocationSelectionLinks();
            const cityName = link.dataset.city;
            const slug = getLocationSlug(link);
            if (cityName) {
                const overlayTrack = slug ? { cta_id: 'nav_location_overlay' } : undefined;
                if (!isSameWindowNavigationClick(e, link)) {
                    closeLocationOverlay();
                    return;
                }

                syncAllLocations(cityName, slug, overlayTrack);
            }

            // Non-location overlay links or modifier clicks: close overlay and let the browser follow href.
            closeLocationOverlay();
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
        if (!link || !isPlainPrimaryClick(event)) return false;
        const target = (link.getAttribute('target') || '').toLowerCase();
        return !target || target === '_self';
    }

    function isPlainPrimaryClick(event) {
        return !!event
            && !event.defaultPrevented
            && event.button === 0
            && !event.metaKey
            && !event.ctrlKey
            && !event.shiftKey
            && !event.altKey;
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
        iframe.title = translate('a11y.map', 'Map');
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

        const locationName = localizedLocationName(overlayView.location, data.name);
        infoPanel.querySelector('.location-info-name').textContent = locationName;
        const addrEl = infoPanel.querySelector('.location-info-address');
        setAddressText(addrEl, data.addressText, locationName);
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

        if (empty) {
            empty.hidden = true;
        }
        details.hidden = false;
    }

    function syncNavLocationState(loc) {
        const mainLocText = document.getElementById('locationText');
        if (mainLocText && loc && (loc.shortName || loc.name)) {
            mainLocText.textContent = localizedLocationName(loc, loc.shortName || loc.name);
        }
        if (loc && (loc.id || loc.slug)) {
            showLocationInfo(loc.id || loc.slug);
        }
        updateLocationScopedLinks();
    }

    // Utility bar: show the selected location + today's hours, and the account menu.
    const utilityName = document.getElementById('utilityLocationName');
    const utilityHours = document.getElementById('utilityHours');
    const utilityChoose = document.getElementById('utilityChoose');
    const utilityChange = document.getElementById('utilityChange');

    function renderUtilityLocation(loc) {
        if (!utilityName) return;
        const hasLoc = !!(loc && (loc.shortName || loc.name));
        utilityName.hidden = !hasLoc;
        if (utilityChoose) utilityChoose.hidden = hasLoc;
        if (utilityChange) utilityChange.hidden = !hasLoc;
        if (!hasLoc) {
            if (utilityHours) utilityHours.hidden = true;
            return;
        }
        utilityName.textContent = loc.shortName || loc.name;
        utilityName.setAttribute('href', localizedPathContext(window.location.pathname || '/').localePrefix + '/' + (loc.slug || loc.id));
        if (!utilityHours) return;
        const today = window.TM && typeof window.TM.getTodayHours === 'function' ? window.TM.getTodayHours() : null;
        utilityHours.textContent = '';
        if (loc.status === 'coming-soon') {
            utilityHours.textContent = translate('location.comingSoon', 'Coming Soon');
        } else if (today && today.label) {
            utilityHours.appendChild(document.createTextNode(translate('utility.openToday', 'Open today:') + ' '));
            const strong = document.createElement('strong');
            strong.textContent = translateHoursText(today.label);
            utilityHours.appendChild(strong);
        } else if (loc.hours && Object.keys(loc.hours).length) {
            utilityHours.textContent = translate('utility.closedToday', 'Closed today');
        }
        utilityHours.hidden = !utilityHours.textContent;
    }

    document.querySelectorAll('[data-utility-change-location]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (locationBtn) locationBtn.click();
        });
    });

    if (window.TM && window.TM.ready && typeof window.TM.ready.then === 'function') {
        window.TM.ready.then(function () { renderUtilityLocation(window.TM.current); });
    }

    const accountBtn = document.getElementById('utilityAccountBtn');
    const accountMenu = document.getElementById('utilityAccountMenu');
    if (accountBtn && accountMenu) {
        function setAccountMenu(open) {
            accountMenu.hidden = !open;
            accountBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        accountBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const open = accountMenu.hidden;
            if (open) document.dispatchEvent(new CustomEvent('tm:utility-menu-open', { detail: accountMenu }));
            setAccountMenu(open);
        });
        document.addEventListener('tm:utility-menu-open', function (e) {
            if (e.detail !== accountMenu) setAccountMenu(false);
        });
        document.addEventListener('click', function (e) {
            if (!accountMenu.hidden && !accountMenu.contains(e.target)) setAccountMenu(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !accountMenu.hidden) {
                setAccountMenu(false);
                accountBtn.focus();
            }
        });
    }

    // Utility bar language menu: drives the hidden language <select> (language-switcher.js owns the change).
    document.querySelectorAll('[data-language-menu]').forEach(function (menu) {
        const form = menu.closest('[data-language-switcher]');
        const select = form ? form.querySelector('[data-language-select]') : null;
        const btn = menu.querySelector('.language-menu-btn');
        const list = menu.querySelector('.language-menu-list');
        const current = menu.querySelector('[data-language-menu-current]');
        if (!select || !btn || !list) return;

        function syncLanguageMenu() {
            const option = select.options[select.selectedIndex];
            if (current && option) {
                current.textContent = option.textContent.trim();
                current.setAttribute('data-label', current.textContent);
            }
            list.querySelectorAll('[data-language-option]').forEach(function (item) {
                if (item.getAttribute('data-language-option') === select.value) item.setAttribute('aria-current', 'true');
                else item.removeAttribute('aria-current');
            });
        }
        function setLanguageMenu(open) {
            list.hidden = !open;
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const open = list.hidden;
            if (open) document.dispatchEvent(new CustomEvent('tm:utility-menu-open', { detail: menu }));
            setLanguageMenu(open);
        });
        document.addEventListener('tm:utility-menu-open', function (e) {
            if (e.detail !== menu) setLanguageMenu(false);
        });
        list.addEventListener('click', function (e) {
            const item = e.target.closest('[data-language-option]');
            if (!item) return;
            setLanguageMenu(false);
            const code = item.getAttribute('data-language-option');
            if (code === select.value) return;
            select.value = code;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            syncLanguageMenu();
        });
        document.addEventListener('click', function (e) {
            if (!list.hidden && !menu.contains(e.target)) setLanguageMenu(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !list.hidden) {
                setLanguageMenu(false);
                btn.focus();
            }
        });
        select.addEventListener('change', syncLanguageMenu);
        document.addEventListener('tm:language-changed', syncLanguageMenu);
        syncLanguageMenu();
    });

    // Keep the bold-hover width reservation in step with translated labels
    function syncBoldHoverLabels() {
        document.querySelectorAll('.bold-hover').forEach(function (el) {
            el.setAttribute('data-label', el.textContent.trim());
        });
    }
    document.addEventListener('tm:language-changed', syncBoldHoverLabels);
    syncBoldHoverLabels();

    // Location overlay search: filter the location list as you type
    const locationSearch = document.getElementById('locationSearch');
    if (locationSearch && locationOverlay) {
        const searchEmpty = locationOverlay.querySelector('.location-search-empty');
        function syncSearchPlaceholder() {
            locationSearch.placeholder = translate('location.searchPlaceholder', 'Search by city or state');
        }
        function filterLocations() {
            const query = locationSearch.value.trim().toLowerCase();
            let matches = 0;
            locationOverlay.querySelectorAll('.location-group').forEach(function (group) {
                let groupMatches = 0;
                group.querySelectorAll('a[data-tm-location-slug]').forEach(function (link) {
                    const text = (link.textContent + ' ' + (link.dataset.city || '') + ' ' + (link.dataset.tmLocationSlug || '')).toLowerCase();
                    const show = !query || text.indexOf(query) !== -1;
                    link.hidden = !show;
                    if (show) groupMatches += 1;
                });
                group.hidden = groupMatches === 0;
                matches += groupMatches;
            });
            if (searchEmpty) searchEmpty.hidden = matches > 0;
        }
        locationSearch.addEventListener('input', filterLocations);
        document.addEventListener('tm:language-changed', syncSearchPlaceholder);
        syncSearchPlaceholder();
    }

    // Nearest location (Topgolf-style): ask for the browser position only when the selector
    // opens, sort each region by Haversine distance, show the distance and mark the nearest.
    // The position is remembered so the prompt doesn't repeat; blocked/unsupported falls back
    // silently to the normal list.
    const GEO_STORAGE_KEY = 'tm_geo_position';
    const GEO_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
    let geoRequestInFlight = false;

    function distanceMiles(lat1, lon1, lat2, lon2) {
        const R = 3958.8;
        const toRad = function (d) { return d * Math.PI / 180; };
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.pow(Math.sin(dLat / 2), 2)
            + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.pow(Math.sin(dLon / 2), 2);
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    function readSavedPosition() {
        try {
            const saved = JSON.parse(localStorage.getItem(GEO_STORAGE_KEY) || 'null');
            if (saved && typeof saved.lat === 'number' && typeof saved.lng === 'number'
                && Date.now() - (saved.savedAt || 0) < GEO_MAX_AGE_MS) {
                return saved;
            }
        } catch (e) { /* storage unavailable */ }
        return null;
    }

    function savePosition(lat, lng) {
        try {
            localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify({ lat: lat, lng: lng, savedAt: Date.now() }));
        } catch (e) { /* storage unavailable */ }
    }

    function usesKilometers() {
        const profile = window.__TM_SITE_PROFILE__ || {};
        return profile.id === 'eu';
    }

    function formatDistance(miles) {
        const value = usesKilometers() ? miles * 1.609344 : miles;
        const unit = usesKilometers() ? 'km' : 'mi';
        const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
        return rounded.toLocaleString() + ' ' + unit;
    }

    function venueCoords(slug) {
        const loc = window.TM && typeof window.TM.get === 'function' ? window.TM.get(slug) : null;
        const geo = loc && loc.geo;
        if (!geo || typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') return null;
        return geo;
    }

    function applyDistanceOrder(position) {
        if (!locationOverlay || !position) return;
        let nearest = null;
        const groups = Array.from(locationOverlay.querySelectorAll('.location-group'));
        groups.forEach(function (group) {
            const links = Array.from(group.querySelectorAll('a[data-tm-location-slug]'));
            let groupMin = Infinity;
            links.forEach(function (link) {
                const geo = venueCoords(link.dataset.tmLocationSlug);
                const miles = geo ? distanceMiles(position.lat, position.lng, geo.latitude, geo.longitude) : Infinity;
                link.dataset.distance = String(miles);
                link.classList.remove('is-nearest');
                let chip = link.querySelector('.location-distance');
                if (Number.isFinite(miles)) {
                    if (!chip) {
                        chip = document.createElement('span');
                        chip.className = 'location-distance';
                        const label = link.querySelector('.location-link-label');
                        if (label) label.after(chip);
                        else link.appendChild(chip);
                    }
                    chip.textContent = formatDistance(miles);
                    groupMin = Math.min(groupMin, miles);
                    const isComingSoon = link.classList.contains('location-coming-soon');
                    if (!isComingSoon && (!nearest || miles < nearest.miles)) nearest = { link: link, miles: miles };
                } else if (chip) {
                    chip.remove();
                }
            });
            links.sort(function (a, b) { return Number(a.dataset.distance) - Number(b.dataset.distance); })
                .forEach(function (link) { group.appendChild(link); });
            group.dataset.distance = String(groupMin);
        });
        // Closest region first (e.g. Europe on top for visitors in Europe)
        const parent = groups[0] && groups[0].parentElement;
        if (parent) {
            const anchorNode = parent.querySelector('.location-search-empty');
            groups.slice().sort(function (a, b) { return Number(a.dataset.distance) - Number(b.dataset.distance); })
                .forEach(function (group) { parent.insertBefore(group, anchorNode || null); });
        }
        if (nearest) {
            nearest.link.classList.add('is-nearest');
            nearest.link.parentElement.insertBefore(nearest.link, nearest.link.parentElement.querySelector('a[data-tm-location-slug]'));
            const tag = document.createElement('span');
            tag.className = 'location-nearest-tag';
            tag.setAttribute('data-i18n', 'location.nearest');
            tag.textContent = translate('location.nearest', 'Nearest');
            const oldTag = locationOverlay.querySelector('.location-nearest-tag');
            if (oldTag) oldTag.remove();
            const label = nearest.link.querySelector('.location-link-label');
            if (label) label.appendChild(tag);
            // Preview the nearest venue's details when nothing is selected yet
            const current = window.TM && window.TM.current;
            if (!current && !narrowPickerQuery.matches) showLocationInfo(nearest.link.dataset.tmLocationSlug);
        }
        locationOverlay.classList.add('has-distances');
    }

    function sortLocationsByDistance() {
        const saved = readSavedPosition();
        if (saved) {
            applyDistanceOrder(saved);
            return;
        }
        if (geoRequestInFlight || !window.isSecureContext || !navigator.geolocation) return;
        geoRequestInFlight = true;
        navigator.geolocation.getCurrentPosition(function (pos) {
            geoRequestInFlight = false;
            const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            savePosition(position.lat, position.lng);
            applyDistanceOrder(position);
        }, function () {
            // Blocked, unavailable or timed out: keep the standard list, no message
            geoRequestInFlight = false;
        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 });
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
            renderUtilityLocation(loc);
        });
    }

    document.addEventListener('tm:locations-ready', function (event) {
        syncNavLocationState(event.detail || null);
        renderUtilityLocation(event.detail || null);
    });

    document.addEventListener('tm:location-changed', function (event) {
        syncNavLocationState(event.detail || null);
        renderUtilityLocation(event.detail || null);
    });

    document.addEventListener('tm:language-changed', function () {
        if (activeLocationInfoRef) showLocationInfo(activeLocationInfoRef);
        if (window.TM) renderUtilityLocation(window.TM.current);
    });
})();
