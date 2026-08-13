(function () {
    'use strict';

    document.addEventListener('click', function (event) {
        var link = event.target && event.target.closest
            ? event.target.closest('[data-tm-promo-cta]')
            : null;
        if (!link || !window.TMAnalytics || typeof window.TMAnalytics.track !== 'function') return;

        var destination = String(link.getAttribute('href') || '').trim();
        var safeDestination = typeof window.TMAnalytics.safeDestination === 'function'
            ? window.TMAnalytics.safeDestination(destination)
            : destination;
        var ctaId = String(link.getAttribute('data-tm-promo-cta') || 'promo_cta').slice(0, 80);
        var locationSlug = String(link.getAttribute('data-tm-location') || 'houston').slice(0, 80);

        window.TMAnalytics.track('booking_click', {
            cta_id: ctaId,
            destination_url: safeDestination.split('?')[0],
            location_slug: locationSlug,
        });
        window.TMAnalytics.track('checkout_start', {
            cta_id: ctaId,
            destination_url: safeDestination,
            location_slug: locationSlug,
        });
    }, true);
})();
