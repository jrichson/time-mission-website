// ==========================================
// SHARED NAVIGATION JS
// Mobile menu toggle, location picker, scroll effect
// ==========================================

(function() {
    const menuBtn = document.querySelector('.nav-menu-btn');
    const mobileMenu = document.getElementById('mobileMenu');
    const navEl = document.getElementById('nav');

    // Logo — if a location is saved, route home to that location's page
    // (reads localStorage synchronously so it works before locations.json finishes loading)
    document.querySelectorAll('.nav-logo, .location-dropdown-logo').forEach(logo => {
        logo.addEventListener('click', function (e) {
            let slug = '';
            try { slug = localStorage.getItem('tm_location') || ''; } catch (err) {}
            if (!slug) return; // no location — let the default index.html link work
            e.preventDefault();
            const inSubdir = window.location.pathname.includes('/locations/');
            window.location.href = (inSubdir ? '../' : '') + slug + '.html';
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
    function syncAllLocations(city) {
        const mainLocText = document.getElementById('locationText');
        if (mainLocText) mainLocText.textContent = city;
        // Write both storage keys so every consumer agrees:
        //   timeMissionLocation (city display name) — nav.js, ticket-panel.js
        //   tm_location (slug)                     — nav.js logo routing, locations.js
        localStorage.setItem('timeMissionLocation', city);
        localStorage.setItem('tm_location', city.toLowerCase().replace(/\s+/g, '-'));
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
                const cityName = link.dataset.city;
                if (cityName) showLocationInfo(cityName);
            });

            link.addEventListener('click', (e) => {
                const cityName = link.dataset.city;
                if (cityName) {
                    syncAllLocations(cityName);
                    showLocationInfo(cityName);
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
        const savedLocation = localStorage.getItem('timeMissionLocation');
        if (savedLocation && !isIndexPage) {
            syncAllLocations(savedLocation);
        }
    }

    // Location data for info panel.
    // KEEP IN SYNC WITH data/locations.json — long-term source of truth will feed this
    // at runtime. Verified against live timemission.com on 2026-04-22.
    const locationData = {
        'Mount Prospect': {
            name: 'IL – Mount Prospect',
            address: '132 Randhurst Village Drive\nMount Prospect, IL 60056',
            phone: '(847) 250-9560',
            hours: 'Mon - Thurs: 12pm - 9pm\nFri: 12pm - Midnight\nSat: 10am - Midnight\nSun: 10am - 8pm',
            bookUrl: 'https://ecom.roller.app/timemissionmountprospect/onlinecheckout/en-us/products',
            pageUrl: 'mount-prospect.html',
            mapQuery: '132+Randhurst+Village+Drive+Mount+Prospect+IL+60056'
        },
        'Philadelphia': {
            name: 'PA – Philadelphia',
            address: '1530 Chestnut Street\nPhiladelphia, PA 19102',
            phone: '(267) 710-1240',
            hours: 'Mon - Thurs: 12pm - 10pm\nFri: 12pm - 11pm\nSat: 10am - 11pm\nSun: 10am - 10pm',
            bookUrl: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
            pageUrl: 'philadelphia.html',
            mapQuery: '1530+Chestnut+Street+Philadelphia+PA+19102'
        },
        'West Nyack': {
            name: 'NY – West Nyack',
            address: '3532 Palisades Center Dr, Level 3\nWest Nyack, NY 10994',
            phone: '(845) 328-4528',
            hours: 'Mon - Thurs: 12pm - 9pm\nFri: 12pm - 11pm\nSat: 10am - 11pm\nSun: 10am - 8pm',
            bookUrl: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
            pageUrl: 'west-nyack.html',
            mapQuery: '3532+Palisades+Center+Dr+West+Nyack+NY+10994'
        },
        'Lincoln': {
            name: 'RI – Lincoln',
            address: 'R1 Indoor Karting, 100 Higginson Ave\nLincoln, RI 02865',
            phone: '(401) 721-5554',
            hours: 'Mon - Thurs: 12pm - 11pm\nFri: 12pm - Midnight\nSat: 9am - Midnight\nSun: 9am - 11pm',
            bookUrl: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
            pageUrl: 'lincoln.html',
            mapQuery: '100+Higginson+Ave+Lincoln+RI+02865'
        },
        'Houston': {
            name: 'TX – Houston (Marq\'E)',
            address: "Marq'E Entertainment District\nHouston, TX",
            phone: '',
            hours: 'Coming Soon',
            bookUrl: '',
            pageUrl: 'houston.html',
            mapQuery: 'Marq+E+Entertainment+District+Houston+TX'
        },
        'Manassas': {
            name: 'VA – Manassas',
            address: 'Manassas Mall, 8300 Sudley Rd, Unit A2\nManassas, VA 20109',
            phone: '(571) 732-1050',
            hours: 'Mon - Thurs: 12pm - 9pm\nFri: 12pm - Midnight\nSat: 10am - Midnight\nSun: 10am - 8pm',
            bookUrl: 'https://ecom.roller.app/timemissionmanassasmall/onlinecheckout/en-us/products',
            pageUrl: 'manassas.html',
            mapQuery: '8300+Sudley+Rd+Manassas+VA+20109'
        },
        'Antwerp': {
            name: 'Belgium – Antwerp',
            address: 'Experience Factory, Michiganstraat 1\n2030 Antwerp, Belgium',
            phone: '+32 3 301 03 03',
            hours: 'Mon - Fri: 2pm - 11pm\nSat - Sun: 11am - 11pm',
            bookUrl: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
            pageUrl: 'antwerp.html',
            mapQuery: 'Michiganstraat+1+Antwerp+Belgium'
        }
    };

    // Show location info in overlay panel
    function showLocationInfo(cityName) {
        const infoPanel = document.getElementById('locationInfo');
        if (!infoPanel) return;
        const empty = infoPanel.querySelector('.location-info-empty');
        const details = infoPanel.querySelector('.location-info-details');
        const mapEl = document.getElementById('locationMap');
        const data = locationData[cityName];
        if (!data || !details) return;

        infoPanel.querySelector('.location-info-name').textContent = data.name;
        const addrEl = infoPanel.querySelector('.location-info-address');
        addrEl.innerHTML = data.address.replace(/\n/g, '<br>');
        addrEl.href = 'https://www.google.com/maps/dir/?api=1&destination=' + data.mapQuery;
        infoPanel.querySelector('.location-info-phone').textContent = data.phone;
        infoPanel.querySelector('.location-info-hours').innerHTML = data.hours.replace(/\n/g, '<br>');
        infoPanel.querySelector('.location-info-book').href = data.pageUrl + '?book=1';

        // Show map embed
        if (mapEl && data.mapQuery) {
            mapEl.innerHTML = '<iframe src="https://www.google.com/maps?q=' + data.mapQuery + '&output=embed&z=12" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map"></iframe>';
            mapEl.style.display = 'block';
        }

        if (empty) empty.style.display = 'none';
        details.style.display = 'block';
    }

    // Show info for saved location on load
    const savedLoc = localStorage.getItem('timeMissionLocation');
    if (savedLoc) showLocationInfo(savedLoc);

    // Update booking URLs based on selected location
    const bookingUrls = locationData;
    const bookingButtons = document.querySelectorAll('.btn-tickets, .btn-primary[href*="roller"], .btn-nav[href*="roller"]');
    // URL updating will be handled when location-specific URLs are ready
})();
