(function () {
    'use strict';

    document.addEventListener('click', function (event) {
        var link = event.target && event.target.closest
            ? event.target.closest('[data-tm-promo-cta]')
            : null;
        if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var destination = String(link.getAttribute('href') || '').trim();
        if (!/^https:\/\/ecom\.roller\.app\//i.test(destination)) return;
        var analytics = window.TMAnalytics;
        var safeDestination = analytics && typeof analytics.safeDestination === 'function'
            ? analytics.safeDestination(destination)
            : destination;
        var ctaId = String(link.getAttribute('data-tm-promo-cta') || 'promo_cta').slice(0, 80);
        var locationSlug = String(link.getAttribute('data-tm-location') || 'houston').slice(0, 80);

        if (analytics && typeof analytics.track === 'function') {
            analytics.track('booking_click', {
                cta_id: ctaId,
                destination_url: safeDestination.split('?')[0],
                location_slug: locationSlug,
            });
            analytics.track('checkout_start', {
                cta_id: ctaId,
                destination_url: safeDestination,
                location_slug: locationSlug,
            });
        }

        event.preventDefault();
        window.setTimeout(function () {
            window.location.assign(String(link.getAttribute('href') || destination).trim());
        }, 0);
    }, true);
})();
