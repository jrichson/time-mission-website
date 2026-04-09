// ==========================================
// SHARED NAVIGATION JS
// Mobile menu toggle, location picker, scroll effect
// ==========================================

(function() {
    const menuBtn = document.querySelector('.nav-menu-btn');
    const mobileMenu = document.getElementById('mobileMenu');
    const navEl = document.getElementById('nav');

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
        localStorage.setItem('timeMissionLocation', city);
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
            document.body.style.overflow = 'hidden';
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

    // Location data for info panel
    const locationData = {
        'Mount Prospect': {
            name: 'IL – Chicago (Mount Prospect)',
            address: '1500 E Golf Rd\nMount Prospect, IL 60056',
            phone: '(847) 243-5500',
            hours: 'Mon - Thurs: 10:00 AM - 9:00 PM\nFri - Sat: 10:00 AM - 11:00 PM\nSun: 10:00 AM - 9:00 PM',
            bookUrl: 'https://ecom.roller.app/timemissionmountprospect/onlinecheckout/en-us/products',
            pageUrl: 'mount-prospect.html',
            mapQuery: '1500+E+Golf+Rd,+Mount+Prospect,+IL+60056'
        },
        'Philadelphia': {
            name: 'PA – Philadelphia',
            address: '325 N 12th St\nPhiladelphia, PA 19107',
            phone: '(215) 515-3500',
            hours: 'Mon - Thurs: 10:00 AM - 9:00 PM\nFri - Sat: 10:00 AM - 11:00 PM\nSun: 10:00 AM - 9:00 PM',
            bookUrl: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
            pageUrl: 'philadelphia.html',
            mapQuery: '325+N+12th+St,+Philadelphia,+PA+19107'
        },
        'West Nyack': {
            name: 'NY – West Nyack',
            address: '4590 Palisades Center Dr\nWest Nyack, NY 10994',
            phone: '(845) 348-1555',
            hours: 'Mon - Thurs: 10:00 AM - 9:00 PM\nFri - Sat: 10:00 AM - 11:00 PM\nSun: 11:00 AM - 7:00 PM',
            bookUrl: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
            pageUrl: 'west-nyack.html',
            mapQuery: '4590+Palisades+Center+Dr,+West+Nyack,+NY+10994'
        },
        'Lincoln': {
            name: 'RI – Lincoln',
            address: '622 George Washington Hwy\nLincoln, RI 02865',
            phone: '(401) 333-4100',
            hours: 'Mon - Thurs: 10:00 AM - 9:00 PM\nFri - Sat: 10:00 AM - 11:00 PM\nSun: 10:00 AM - 9:00 PM',
            bookUrl: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
            pageUrl: 'lincoln.html',
            mapQuery: '622+George+Washington+Hwy,+Lincoln,+RI+02865'
        },
        'Houston': {
            name: 'TX – Houston (Marq\'E)',
            address: "7620 Katy Fwy, Ste 300\nHouston, TX 77024",
            phone: '(713) 322-7100',
            hours: 'Coming Soon',
            bookUrl: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
            pageUrl: 'houston.html',
            mapQuery: '7620+Katy+Fwy,+Houston,+TX+77024'
        },
        'Manassas': {
            name: 'VA – Manassas',
            address: '8305 Sudley Rd\nManassas, VA 20110',
            phone: '(703) 420-3600',
            hours: 'Mon - Thurs: 10:00 AM - 9:00 PM\nFri - Sat: 10:00 AM - 11:00 PM\nSun: 10:00 AM - 9:00 PM',
            bookUrl: 'https://ecom.roller.app/timemissionmanassasmall/onlinecheckout/en-us/products',
            pageUrl: 'manassas.html',
            mapQuery: '8305+Sudley+Rd,+Manassas,+VA+20110'
        },
        'Antwerp': {
            name: 'Belgium – Antwerp',
            address: 'Borsbeeksebrug 30\n2600 Antwerp, Belgium',
            phone: '+32 3 444 55 66',
            hours: 'Mon - Thurs: 10:00 AM - 9:00 PM\nFri - Sat: 10:00 AM - 11:00 PM\nSun: 10:00 AM - 9:00 PM',
            bookUrl: 'https://tickets.timemission.com/onlinecheckout/en-us/products',
            pageUrl: 'antwerp.html',
            mapQuery: 'Borsbeeksebrug+30,+2600+Antwerp,+Belgium'
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
