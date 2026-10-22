(function () {
    'use strict';

    // Opted-in Roller links open the checkout in the page language (Roller reads it from the path).
    function localizedCheckout(link) {
        var href = String(link.getAttribute('href') || '').trim();
        var journey = window.TMBookingJourney;
        if (!link.hasAttribute('data-tm-localize-checkout') || !journey || typeof journey.localizeRollerCheckout !== 'function') return href;
        return journey.localizeRollerCheckout(href);
    }

    function localizeLinks() {
        document.querySelectorAll('[data-tm-promo-cta][data-tm-localize-checkout]').forEach(function (link) {
            link.setAttribute('href', localizedCheckout(link));
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', localizeLinks, { once: true });
    else localizeLinks();

    document.addEventListener('click', function (event) {
        var link = event.target && event.target.closest
            ? event.target.closest('[data-tm-promo-cta]')
            : null;
        if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.hasAttribute('data-tm-booking-trigger')) return;

        var destination = localizedCheckout(link);
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
            window.location.assign(destination);
        }, 0);
    }, true);
})();
