/** URL-based language and venue context for internal navigation. */
(function () {
    'use strict';
    var profile = window.__TM_SITE_PROFILE__ || {};
    var contract = window.__TM_SITE_CONTRACT__ || {};
    var runtime = contract.runtime || {};
    var policy = runtime.navigation || {};
    var locales = profile.locales || [];
    var defaultLocale = profile.defaultLocale || 'en';
    var linkState = new WeakMap();

    function pathContext(pathname) {
        var parts = String(pathname || '/').split('/').filter(Boolean);
        var locale = defaultLocale;
        if (profile.localizedRoutes && locales.indexOf(parts[0]) !== -1) locale = parts.shift();
        return { locale: locale, path: '/' + parts.join('/') };
    }

    function locationSlug(value) {
        value = (policy.locationAliases || {})[value] || value;
        var token = String(value || '').toLowerCase().replace(/\.html$/, '').replace(/-/g, '');
        return (contract.locationIds || []).find(function (slug) {
            return slug.replace(/-/g, '') === token;
        }) || '';
    }

    function pathLocation(pathname) {
        var path = pathContext(pathname).path;
        var root = locationSlug(path.split('/')[1]);
        if (root) return root;
        var prefixes = policy.locationFormPrefixes || [];
        for (var i = 0; i < prefixes.length; i++) {
            if (path.startsWith(prefixes[i] + '/')) return locationSlug(path.slice(prefixes[i].length + 1).split('/')[0]);
        }
        return '';
    }

    function parameterLocation(url) {
        if (!/^\/(contact|contact-thank-you|group-form-thank-you\/jotform)$/.test(pathContext(url.pathname).path)) return '';
        return locationSlug(url.searchParams.get('location') || new URLSearchParams(url.hash.slice(1)).get('location'))
            || (formReturnSource(url) ? pathLocation(formReturnSource(url).pathname) : '');
    }

    function formReturnSource(url) {
        if (pathContext(url.pathname).path !== '/group-form-thank-you/jotform') return null;
        try {
            var source = new URL(url.searchParams.get('source'));
            var sameSite = source.origin === url.origin || source.origin === profile.origin;
            return sameSite && /^\/groups\/inquire\/[a-z-]+\/[a-z-]+$/.test(pathContext(source.pathname).path)
                && pathLocation(source.pathname) ? source : null;
        } catch (_) { return null; }
    }

    function currentLocation() {
        var active = window.TM && window.TM.current;
        if (active) return locationSlug(active.slug || active.id);
        var url = new URL(window.location.href || window.location.pathname || '/', window.location.origin || profile.origin || 'https://www.timemission.com');
        return pathLocation(url.pathname)
            || locationSlug(document.body && document.body.dataset.location)
            || parameterLocation(url);
    }

    function sharedPath(path) {
        path = (policy.aliases || {})[path] || path;
        var normalized = path.replace(/\.html$/, '').replace(/\/$/, '') || '/';
        if ((runtime.locationScopedPaths || []).indexOf(normalized) !== -1) return normalized;
        return (policy.dynamicSharedPrefixes || []).some(function (prefix) {
            return normalized.startsWith(prefix + '/') && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized.slice(prefix.length + 1));
        }) ? normalized : '';
    }

    function href(value, options) {
        var raw = String(value || '');
        if (!profile.localizedRoutes || !raw || raw[0] === '#' || /^(mailto|tel|sms|javascript|data):/i.test(raw)) return raw;
        var opts = options || {};
        var origin = window.location.origin || profile.origin;
        var url;
        try { url = new URL(raw, window.location.href || origin + '/'); } catch (_) { return raw; }
        if (!/^https?:$/.test(url.protocol)) return raw;
        var currentLocale = opts.locale || pathContext(window.location.pathname).locale;
        if (url.origin !== origin && url.origin !== profile.origin) {
            if (url.origin !== profile.counterpartOrigin) return raw;
            var parts = url.pathname.split('/').filter(Boolean);
            if (['en', 'es', 'nl', 'fr'].indexOf(parts[0]) !== -1) parts.shift();
            var counterpartPath = '/' + parts.join('/');
            if (!pathLocation(counterpartPath) && !sharedPath(counterpartPath)) return raw;
            if ((profile.counterpartLocales || []).indexOf(currentLocale) !== -1 && currentLocale !== defaultLocale) parts.unshift(currentLocale);
            url.pathname = '/' + parts.join('/');
            return url.toString();
        }
        var path = pathContext(url.pathname).path;
        path = (policy.aliases || {})[path] || path;
        if (/\.(?!html$)[a-z0-9]+$/i.test(path) || /\/(assets|css|data|fonts|js|api)\//.test(path)) return raw;
        var explicitLocation = pathLocation(path);
        if (explicitLocation && (contract.externalLocationIds || []).indexOf(explicitLocation) !== -1 && profile.counterpartOrigin) {
            var externalUrl = (policy.externalLocationUrls || {})[explicitLocation];
            if (externalUrl && new URL(externalUrl).origin !== profile.counterpartOrigin) return externalUrl;
            var remoteLocale = (profile.counterpartLocales || []).indexOf(currentLocale) !== -1 && currentLocale !== defaultLocale ? '/' + currentLocale : '';
            return profile.counterpartOrigin + remoteLocale + path + url.search + url.hash;
        }
        var canonical = sharedPath(path);
        // Files, API endpoints, and unknown routes are never invented or localized.
        if (!explicitLocation && !canonical && !/^\/group-form-thank-you\/jotform$/.test(path)) return raw;
        var slug = parameterLocation(url) || locationSlug(opts.location) || currentLocation();
        if (opts.scope !== false && !explicitLocation && canonical && slug
            && (contract.externalLocationIds || []).indexOf(slug) === -1) path = '/' + slug + (canonical === '/' ? '' : canonical);
        var prefix = currentLocale !== defaultLocale ? '/' + currentLocale : '';
        return prefix + (path === '/' && prefix ? '' : path) + url.search + url.hash;
    }

    function rewriteLink(link) {
        if (!link || link.hasAttribute('download') || link.hasAttribute('data-language-suggestion-link')) return;
        var state = linkState.get(link) || {};
        ['href', 'data-tm-booking-url'].forEach(function (attribute) {
            var value = link.getAttribute(attribute);
            if (!value) return;
            var prior = state[attribute];
            var original = prior && prior.output === value ? prior.input : value;
            var output = href(original, { location: link.getAttribute('data-tm-location'), scope: !link.hasAttribute('data-tm-no-location-scope') });
            state[attribute] = { input: original, output: output };
            if (value !== output) link.setAttribute(attribute, output);
        });
        linkState.set(link, state);
    }

    function refresh() {
        document.querySelectorAll('a[href], [data-tm-booking-url]').forEach(rewriteLink);
    }

    window.TMNavigation = { href: href, pathContext: pathContext, pathLocation: pathLocation, currentLocation: currentLocation, rewriteLink: rewriteLink, refresh: refresh };
    // Provider return URLs are fixed; recover the supported language from our source page.
    if (profile.localizedRoutes && window.location.href) {
        var returnUrl = new URL(window.location.href);
        var source = formReturnSource(returnUrl);
        if (source && pathContext(returnUrl.pathname).locale === defaultLocale
            && pathContext(source.pathname).locale !== defaultLocale) {
            window.location.replace(href(returnUrl.toString(), { locale: pathContext(source.pathname).locale }));
        }
    }
    document.addEventListener('tm:locations-ready', refresh);
    document.addEventListener('tm:location-changed', refresh);
    window.addEventListener('popstate', refresh);
    document.addEventListener('click', function (event) {
        rewriteLink(event.target && event.target.closest && event.target.closest('a[href]'));
    }, true);
    if (typeof MutationObserver === 'function') {
        var pending = false;
        var observer = new MutationObserver(function () {
            if (pending) return;
            pending = true;
            Promise.resolve().then(function () { pending = false; refresh(); });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'data-tm-booking-url'] });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
    else refresh();
})();
