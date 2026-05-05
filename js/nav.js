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
    function syncAllLocations(city, slug, selectOpts) {
        const normalized = normalizeLocation(slug || city);
        const mainLocText = document.getElementById('locationText');
        if (mainLocText) mainLocText.textContent = city;
        try {
            localStorage.setItem('tm_location', normalized);
            localStorage.setItem('timeMissionLocation', city);
        } catch (err) {}
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

                /*
                 * Narrow viewports + open venues: keep the overlay open after sync so users
                 * can read details; they follow "Full venue page" or Book when ready.
                 * Coming-soon rows still behave like landing links immediately.
                 */
                if (narrowPicker && slug && !isComingSoonLink) {
                    e.preventDefault();
                    // P0-7a: stop bubble to overlay-background click handler (line ~145) which would call closeLocationOverlay()
                    e.stopPropagation();
                    const panel = document.getElementById('locationInfo');
                    if (panel) {
                        requestAnimationFrame(function () {
                            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        });
                    }
                    return;
                }

                // Desktop: default navigation to location slug
                if (!narrowPicker) {
                    return;
                }

                // Mobile coming-soon: close after navigation kicks in
                closeLocationOverlay();
            });
        });
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

        var pageTour = infoPanel.querySelector('.location-info-page');
        if (pageTour && data.pageUrl) {
            pageTour.href = data.pageUrl;
            pageTour.hidden = !!data.comingSoon;
            pageTour.setAttribute(
                'aria-label',
                data.name ? 'Open venue landing page — ' + data.name : 'Open venue landing page'
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
})();
