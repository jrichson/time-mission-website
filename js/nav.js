// ==========================================
// SHARED NAVIGATION JS
// Mobile menu toggle, location picker, scroll effect
// ==========================================

(function() {
    const menuBtn = document.querySelector('.nav-menu-btn');
    const mobileMenu = document.getElementById('mobileMenu');
    const navEl = document.getElementById('nav');

    // Mobile menu toggle
    if (menuBtn && mobileMenu && navEl) {
        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('open');
            navEl.classList.toggle('menu-open');
            document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
        });

        // Close menu when clicking a nav link
        mobileMenu.querySelectorAll('.mobile-menu-links a').forEach(link => {
            link.addEventListener('click', () => {
                menuBtn.classList.remove('active');
                navEl.classList.remove('menu-open');
                mobileMenu.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // Helper to sync all location displays + localStorage
    function syncAllLocations(city) {
        const mainLocText = document.getElementById('locationText');
        if (mainLocText) mainLocText.textContent = city;
        localStorage.setItem('timeMissionLocation', city);
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

    // Location dropdown toggle and selection
    const locationBtn = document.getElementById('locationBtn');
    const locationText = document.getElementById('locationText');
    const locationLinks = document.querySelectorAll('.location-dropdown a');

    if (locationBtn) {
        locationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            locationBtn.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            locationBtn.classList.remove('open');
        });

        // Handle location selection
        locationLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedLocation = link.textContent.trim();
                const cityMatch = selectedLocation.match(/- (.+)$/);
                const cityName = cityMatch ? cityMatch[1].split(' (')[0] : selectedLocation.split(' - ').pop();

                if (locationText) {
                    locationText.style.transition = 'opacity 0.2s ease';
                    locationText.style.opacity = '0';

                    setTimeout(() => {
                        syncAllLocations(cityName);
                        locationText.style.opacity = '1';
                        locationText.style.textShadow = '0 0 15px rgba(0, 229, 255, 0.8)';

                        setTimeout(() => {
                            locationText.style.textShadow = 'none';
                        }, 400);
                    }, 200);
                } else {
                    syncAllLocations(cityName);
                }

                locationBtn.classList.remove('open');
            });
        });

        // Load saved location on page load
        const savedLocation = localStorage.getItem('timeMissionLocation');
        if (savedLocation) {
            syncAllLocations(savedLocation);
        }
    }

    // Update booking URLs based on selected location
    const bookingUrls = {
        'Philadelphia': 'https://ecom.roller.app/lolcommandcenterphiladelphiapa/test/en-us/products',
        'Chicago': 'https://ecom.roller.app/lolcommandcenterphiladelphiapa/test/en-us/products',
        'West Nyack': 'https://ecom.roller.app/lolcommandcenterphiladelphiapa/test/en-us/products',
        'Lincoln': 'https://ecom.roller.app/lolcommandcenterphiladelphiapa/test/en-us/products',
        'Houston': 'https://ecom.roller.app/lolcommandcenterphiladelphiapa/test/en-us/products',
        'Manassas': 'https://ecom.roller.app/lolcommandcenterphiladelphiapa/test/en-us/products',
        'Antwerp': 'https://ecom.roller.app/lolcommandcenterphiladelphiapa/test/en-us/products'
    };

    const bookingButtons = document.querySelectorAll('.btn-tickets, .btn-primary[href*="roller"], .btn-nav[href*="roller"]');
    // URL updating will be handled when location-specific URLs are ready
})();
