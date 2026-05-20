(function () {
    'use strict';

    function normalizeLocation(value) {
        return String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

    function normalizeGroupType(value) {
        return normalizeLocation(value).replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    function normalizeKind(value) {
        return normalizeLocation(value || 'tickets');
    }

    function isNavigableHref(href) {
        var value = String(href || '').trim();
        return !!value && value !== '#' && !/^javascript:/i.test(value);
    }

    function isExternalHttpUrl(href) {
        return /^https?:\/\//i.test(String(href || '').trim());
    }

    function getCurrentSearch() {
        return (window.location && window.location.search) || '';
    }

    function isTrackingParam(name) {
        var key = String(name || '').toLowerCase();
        return /^utm_[a-z0-9_]+$/.test(key)
            || key === 'gclid'
            || key === 'gbraid'
            || key === 'wbraid'
            || key === 'fbclid'
            || key === 'msclkid'
            || key === 'ttclid'
            || key === 'twclid'
            || key === 'li_fat_id'
            || key === 'mc_cid'
            || key === 'mc_eid'
            || key === 'irclickid'
            || key === 'srsltid';
    }

    function collectTrackingParams(search) {
        var params = [];
        var raw = String(search || '');
        if (raw.charAt(0) === '?') raw = raw.slice(1);
        if (!raw) return params;
        new URLSearchParams(raw).forEach(function (value, name) {
            if (!isTrackingParam(name)) return;
            params.push({
                name: name,
                value: value,
            });
        });
        return params;
    }

    function appendTrackingParams(href, options) {
        var opts = options || {};
        var value = String(href || '').trim();
        if (!value) return value;
        if (!isExternalHttpUrl(value) && !opts.includeInternal) return value;
        var tracking = collectTrackingParams(opts.search || getCurrentSearch());
        if (!tracking.length) return value;

        var hash = '';
        var hashIndex = value.indexOf('#');
        if (hashIndex !== -1) {
            hash = value.slice(hashIndex);
            value = value.slice(0, hashIndex);
        }

        var queryIndex = value.indexOf('?');
        var base = queryIndex === -1 ? value : value.slice(0, queryIndex);
        var params = new URLSearchParams(queryIndex === -1 ? '' : value.slice(queryIndex + 1));
        var existing = {};
        params.forEach(function (_value, name) {
            existing[String(name || '').toLowerCase()] = true;
        });
        tracking.forEach(function (param) {
            var key = String(param.name || '').toLowerCase();
            if (existing[key]) return;
            params.append(param.name, param.value);
            existing[key] = true;
        });
        var query = params.toString();
        return base + (query ? '?' + query : '') + hash;
    }

    function getBookingHref(el) {
        if (!el || typeof el.getAttribute !== 'function') return '';
        return el.getAttribute('data-tm-booking-url') || el.getAttribute('href') || '';
    }

    function resolveOpenCheckoutUrl(loc) {
        if (!loc) return '';
        var roller = (loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        if (roller) return roller;
        return (loc.bookingUrl && String(loc.bookingUrl).trim()) || '';
    }

    function getExternalLocationUrl(loc) {
        return (loc && loc.externalUrl && String(loc.externalUrl).trim()) || '';
    }

    function isBookableLocation(loc) {
        return !!resolveOpenCheckoutUrl(loc);
    }

    function isLeadOnlyComingSoon(loc) {
        return !!(loc && loc.status === 'coming-soon' && !isBookableLocation(loc));
    }

    function isBriqWidgetLocation(loc) {
        return !!(loc && loc.bookingProvider === 'briq' && loc.briqWidget);
    }

    function isSameLocationPage(loc, pageLocationSlug) {
        var pageSlug = normalizeLocation(pageLocationSlug || '');
        if (!loc || !pageSlug) return false;
        return pageSlug === normalizeLocation(loc.slug || '')
            || pageSlug === normalizeLocation(loc.id || '');
    }

    function urlsShareOriginAndPath(firstUrl, secondUrl) {
        var base = (window.location && window.location.origin) || 'https://timemission.com';
        try {
            var first = new URL(firstUrl, base);
            var second = new URL(secondUrl, base);
            return first.origin === second.origin
                && first.pathname.replace(/\/+$/, '') === second.pathname.replace(/\/+$/, '');
        } catch (e) {
            return String(firstUrl || '').replace(/\/+$/, '') === String(secondUrl || '').replace(/\/+$/, '');
        }
    }

    function isBriqProviderUrl(loc, href) {
        return isBriqWidgetLocation(loc)
            && !!href
            && urlsShareOriginAndPath(href, loc.bookingUrl || '');
    }

    function briqWidgetDestination(loc, slug, pageLocationSlug, fallbackHref) {
        if (isSameLocationPage(loc, pageLocationSlug)) return '#briq-widget-container';
        return slug ? appendTrackingParams('/' + slug + '?book=1', { includeInternal: true }) : fallbackHref;
    }

    function resolveComingSoonLeadUrl(loc, fallbackSlug) {
        var slug = (loc && (loc.slug || loc.id)) || fallbackSlug || '';
        return slug ? '/contact?location=' + encodeURIComponent(slug) + '&type=updates' : '/contact?type=updates';
    }

    function resolveLocationDestination(loc, options) {
        var opts = options || {};
        if (!loc) return '';
        var kind = normalizeKind(opts.kind || 'tickets');
        var slug = loc.slug || loc.id || normalizeLocation(opts.locationId || opts.pageLocationSlug || '');
        var checkoutUrl = resolveOpenCheckoutUrl(loc);
        var bookable = !!checkoutUrl;

        if (kind === 'gift-cards' || kind === 'giftcards') {
            if (loc.giftCardUrl) return loc.giftCardUrl;
            return '';
        }

        if (kind === 'waiver' || kind === 'waivers') {
            if (loc.waiverUrl) return loc.waiverUrl;
            return '';
        }

        if (kind === 'groups') {
            var groupType = normalizeGroupType(opts.groupType || opts.pageGroupType || '');
            var groupUrls = loc.groupFormUrls || {};
            var groupUrl = (groupType && groupUrls[groupType]) || groupUrls.default || loc.groupsUrl || '';
            if (isBriqProviderUrl(loc, groupUrl)) {
                return briqWidgetDestination(loc, slug, opts.pageLocationSlug, groupUrl);
            }
            if (groupUrl) return groupUrl;
            return '';
        }

        var externalUrl = getExternalLocationUrl(loc);
        if (externalUrl) return externalUrl;
        if (isBriqWidgetLocation(loc)) {
            return briqWidgetDestination(loc, slug, opts.pageLocationSlug, checkoutUrl);
        }
        if (opts.preferLocationPageFlow && slug) {
            return appendTrackingParams('/' + slug + '?book=1', { includeInternal: true });
        }
        if (bookable) return checkoutUrl;
        if (loc.status === 'coming-soon') return resolveComingSoonLeadUrl(loc, slug);
        return '';
    }

    function isLocationExternalSiteUrl(loc, href) {
        var externalUrl = getExternalLocationUrl(loc);
        return !!externalUrl && String(href || '').trim() === externalUrl;
    }

    function isTicketKind(kind) {
        return normalizeKind(kind) === 'tickets';
    }

    function shouldUseRollerCheckout(loc, href, kind) {
        if (!loc || normalizeKind(kind) !== 'tickets') return false;
        var roller = (loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        return !!roller && href === roller;
    }

    function shouldUseBriqWidget(loc, href, kind, pageLocationSlug) {
        var normalizedKind = normalizeKind(kind);
        return (normalizedKind === 'tickets' || normalizedKind === 'groups')
            && isBriqWidgetLocation(loc)
            && isSameLocationPage(loc, pageLocationSlug)
            && String(href || '').trim() === '#briq-widget-container';
    }

    function shouldAppendTrackingForPresentation(presentation) {
        return presentation === 'link'
            || presentation === 'external-site'
            || presentation === 'iframe';
    }

    function bookingPresentationFor(loc, kind, href, options) {
        var opts = options || {};
        if (!isNavigableHref(href)) return 'panel';
        if (shouldUseBriqWidget(loc, href, kind, opts.pageLocationSlug)) return 'briq-widget';
        if (isLocationExternalSiteUrl(loc, href)) return 'external-site';
        if (isTicketKind(kind) && shouldUseRollerCheckout(loc, href, kind)) return 'roller';
        return 'link';
    }

    function resolveIntent(options) {
        var opts = options || {};
        var currentTarget = opts.currentTarget || null;
        var kind = normalizeKind(
            opts.kind
            || (currentTarget && currentTarget.getAttribute('data-tm-booking-kind'))
            || 'tickets'
        );
        var groupType = normalizeGroupType(
            opts.groupType
            || opts.pageGroupType
            || (currentTarget && (currentTarget.getAttribute('data-tm-group-type') || currentTarget.getAttribute('data-tm-page-group')))
            || ''
        );
        var locationId = normalizeLocation(
            opts.locationId
            || (currentTarget && currentTarget.getAttribute('data-tm-location'))
            || ''
        );
        var pageLocationSlug = normalizeLocation(opts.pageLocationSlug || '');
        var loc = opts.location || null;
        var href = String(opts.href || '').trim();
        if (!href && currentTarget) href = getBookingHref(currentTarget);

        if (loc && opts.resolveHref !== false && (isTicketKind(kind) || !isNavigableHref(href))) {
            var resolvedHref = resolveLocationDestination(loc, {
                kind: kind,
                groupType: groupType,
                locationId: locationId,
                pageLocationSlug: pageLocationSlug,
                preferLocationPageFlow: !!opts.preferLocationPageFlow,
            });
            if (resolvedHref) href = resolvedHref;
        }

        var locationSlug = normalizeLocation(
            locationId
            || pageLocationSlug
            || (loc && (loc.id || loc.slug))
            || ''
        );
        var presentation = bookingPresentationFor(loc, kind, href, {
            pageLocationSlug: pageLocationSlug,
        });
        if (shouldAppendTrackingForPresentation(presentation)) {
            href = appendTrackingParams(href);
        }
        return {
            kind: kind,
            groupType: groupType,
            locationId: locationId,
            pageLocationSlug: pageLocationSlug,
            location: loc,
            locationSlug: locationSlug,
            href: href,
            hasHref: isNavigableHref(href),
            presentation: presentation,
            usesBookingFrame: presentation === 'iframe',
            usesRollerCheckout: presentation === 'roller',
            usesBriqWidget: presentation === 'briq-widget',
            externalLocationSite: presentation === 'external-site',
        };
    }

    function resolveCtaView(loc, options) {
        var opts = options || {};
        var kind = normalizeKind(opts.kind || 'tickets');
        var locationId = normalizeLocation(opts.locationId || (loc && (loc.id || loc.slug)) || '');
        var intent = resolveIntent({
            kind: kind,
            groupType: opts.groupType || opts.pageGroupType || '',
            locationId: locationId,
            pageLocationSlug: opts.pageLocationSlug || '',
            location: loc || null,
            resolveHref: true,
        });
        var trigger = intent.usesBookingFrame || intent.usesRollerCheckout || intent.usesBriqWidget;
        return {
            kind: intent.kind,
            groupType: intent.groupType,
            locationId: locationId,
            href: trigger ? '#' : (intent.href || '#'),
            bookingUrl: trigger ? intent.href : '',
            url: intent.href,
            trigger: trigger,
            externalLocation: intent.externalLocationSite,
            disabled: !loc || !intent.hasHref,
            presentation: intent.presentation,
        };
    }

    function resolveNavigationAction(intent, options) {
        var opts = options || {};
        var resolved = intent || {};
        var href = String(resolved.href || '').trim();
        if (!isNavigableHref(href)) {
            return { type: 'panel', href: href, shouldPreventDefault: true, trackCheckout: false };
        }
        if (resolved.externalLocationSite || resolved.presentation === 'external-site') {
            return { type: 'external-site', href: href, shouldPreventDefault: true, trackCheckout: isExternalHttpUrl(href) };
        }
        if (!opts.deferUntilLoad && (resolved.usesBriqWidget || resolved.presentation === 'briq-widget')) {
            return { type: 'briq-widget', href: href, shouldPreventDefault: true, trackCheckout: false };
        }
        if (!opts.deferUntilLoad && (resolved.usesRollerCheckout || resolved.presentation === 'roller')) {
            return { type: 'roller', href: href, shouldPreventDefault: true, trackCheckout: isExternalHttpUrl(href) };
        }
        if (!opts.deferUntilLoad && (resolved.usesBookingFrame || resolved.presentation === 'iframe')) {
            return { type: 'iframe', href: href, shouldPreventDefault: true, trackCheckout: isExternalHttpUrl(href) };
        }
        if (opts.deferUntilLoad && (resolved.usesBriqWidget || resolved.presentation === 'briq-widget')) {
            return { type: 'deferred-briq-widget', href: href, shouldPreventDefault: true, trackCheckout: false };
        }
        if (opts.deferUntilLoad && (resolved.usesRollerCheckout || resolved.presentation === 'roller')) {
            return { type: 'deferred-roller', href: href, shouldPreventDefault: true, trackCheckout: isExternalHttpUrl(href) };
        }
        if (opts.deferUntilLoad && (resolved.usesBookingFrame || resolved.presentation === 'iframe')) {
            return { type: 'deferred-iframe', href: href, shouldPreventDefault: true, trackCheckout: isExternalHttpUrl(href) };
        }
        return { type: opts.deferUntilLoad ? 'deferred-link' : 'link', href: href, shouldPreventDefault: true, trackCheckout: isExternalHttpUrl(href) };
    }

    function resolveOutcome(options, actionOptions) {
        var intent = resolveIntent(options || {});
        return {
            intent: intent,
            cta: ctaAttributesForIntent(intent),
            action: resolveNavigationAction(intent, actionOptions || {}),
        };
    }

    function ctaAttributesForIntent(intent) {
        var resolved = intent || {};
        var attrs = {
            href: '#',
            bookingUrl: '',
            kind: normalizeKind(resolved.kind || 'tickets'),
            locationId: '',
            groupType: normalizeGroupType(resolved.groupType || ''),
            disabled: !resolved.location || !resolved.hasHref,
            trigger: false,
            externalLocation: !!resolved.externalLocationSite,
        };
        if (!resolved.location) return attrs;
        attrs.disabled = !resolved.hasHref;
        attrs.locationId = (resolved.location && (resolved.location.id || resolved.location.slug)) || resolved.locationId || '';
        if (!resolved.hasHref) return attrs;
        if (resolved.externalLocationSite) {
            attrs.href = resolved.href || '#';
            return attrs;
        }
        if (resolved.usesBookingFrame || resolved.usesRollerCheckout || resolved.usesBriqWidget) {
            attrs.href = '#';
            attrs.bookingUrl = resolved.href || '';
            attrs.trigger = true;
            return attrs;
        }
        attrs.href = resolved.href || '#';
        return attrs;
    }

    window.TMBookingJourney = {
        normalizeLocation: normalizeLocation,
        normalizeGroupType: normalizeGroupType,
        normalizeKind: normalizeKind,
        isNavigableHref: isNavigableHref,
        isExternalHttpUrl: isExternalHttpUrl,
        getBookingHref: getBookingHref,
        appendTrackingParams: appendTrackingParams,
        resolveOpenCheckoutUrl: resolveOpenCheckoutUrl,
        getExternalLocationUrl: getExternalLocationUrl,
        isBookableLocation: isBookableLocation,
        isLeadOnlyComingSoon: isLeadOnlyComingSoon,
        resolveLocationDestination: resolveLocationDestination,
        isTicketKind: isTicketKind,
        resolveIntent: resolveIntent,
        resolveCtaView: resolveCtaView,
        resolveNavigationAction: resolveNavigationAction,
        resolveOutcome: resolveOutcome,
        ctaAttributesForIntent: ctaAttributesForIntent,
    };
})();
