// ==========================================
// SHARED NAVIGATION JS
// Mobile menu toggle, location picker, scroll effect
// ==========================================

(function() {
    function normalizeLocation(value) {
        return (value || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

    function getLocationContext() {
        if (window.LocationContext) return window.LocationContext;
        if (!window.TM) return null;
        return {
            ready: window.TM.ready,
            getCurrent: function() { return window.TM.current || null; },
            select: function(slug) {
                if (typeof window.TM.select === 'function') window.TM.select(slug);
            }
        };
    }

    const menuBtn = document.querySelector('.nav-menu-btn');
    const mobileMenu = document.getElementById('mobileMenu');
    const navEl = document.getElementById('nav');

    // Logo — if a location is saved, route home to that location's page
    // (reads localStorage synchronously so it works before locations.json finishes loading)
    document.querySelectorAll('.nav-logo, .location-dropdown-logo').forEach(logo => {
        logo.addEventListener('click', function (e) {
            const context = getLocationContext();
            const current = context && typeof context.getCurrent === 'function' ? context.getCurrent() : null;
            let slug = (current && (current.slug || current.id)) || '';
            if (!slug) {
                try { slug = localStorage.getItem('tm_location') || ''; } catch (err) {}
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

    // Helper to sync all location displays + localStorage
    function syncAllLocations(city, slug) {
        const normalized = normalizeLocation(slug || city);
        const mainLocText = document.getElementById('locationText');
        if (mainLocText) mainLocText.textContent = city;
        try {
            localStorage.setItem('tm_location', normalized);
            localStorage.setItem('timeMissionLocation', city);
        } catch (err) {}
        const context = getLocationContext();
        if (context && typeof context.select === 'function') {
            context.select(normalized);
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
    const locationText = document.getElementById('locationText');
    const locationOverlay = document.getElementById('locationDropdown');
    const locationLinks = locationOverlay ? locationOverlay.querySelectorAll('a') : [];

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
                if (cityName) {
                    syncAllLocations(cityName, slug);
                    showLocationInfo(slug || cityName);
                }

                const hrefPath = slug;
                if (hrefPath && window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
                    window.TMAnalytics.track('location_select', {
                        location_slug: hrefPath,
                        cta_id: 'nav_location_overlay',
                    });
                }

                // Desktop: save location and navigate to location page
                if (!window.matchMedia('(max-width: 768px)').matches) {
                    // Let the default href navigation happen
                    return;
                }

                // Mobile: save location, close overlay, navigate
                closeLocationOverlay();
            });
        });

        // Load saved location on page load (only on location pages, not index)
        const isIndexPage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/index.htm');
        const context = getLocationContext();
        if (context && context.ready && typeof context.ready.then === 'function') {
            context.ready.then(function () {
                if (isIndexPage) return;
                const current = typeof context.getCurrent === 'function' ? context.getCurrent() : null;
                if (current && current.shortName) {
                    syncAllLocations(current.shortName, current.slug || current.id);
                }
            });
        }
    }

    function getLocationSlug(link) {
        return (link.getAttribute('href') || '').replace(/^\//, '').replace(/\.html$/, '');
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
        if (!context || typeof context.getInfoPanelView !== 'function' || !details) return;

        const data = context.getInfoPanelView(locationRef);
        if (!data) return;

        infoPanel.querySelector('.location-info-name').textContent = data.name;
        const addrEl = infoPanel.querySelector('.location-info-address');
        setMultilineText(addrEl, data.addressText);
        addrEl.href = data.mapDirectionsUrl || '#';
        infoPanel.querySelector('.location-info-phone').textContent = data.phone;
        setMultilineText(infoPanel.querySelector('.location-info-hours'), data.hoursText);
        var bookBtn = infoPanel.querySelector('.location-info-book');
        bookBtn.href = data.bookUrl || data.pageUrl || '#';
        bookBtn.textContent = data.bookLabel || 'Book Now';

        renderMapEmbed(mapEl, data.mapEmbedUrl);

        if (empty) empty.style.display = 'none';
        details.style.display = 'block';
    }

    // Show info for saved location on load
    const contextForInfo = getLocationContext();
    if (contextForInfo && contextForInfo.ready && typeof contextForInfo.ready.then === 'function') {
        contextForInfo.ready.then(function () {
            const current = typeof contextForInfo.getCurrent === 'function' ? contextForInfo.getCurrent() : null;
            if (current && (current.id || current.slug)) showLocationInfo(current.id || current.slug);
        });
    }
})();
