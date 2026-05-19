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

    function resolveComingSoonLeadUrl(loc, fallbackSlug) {
        var slug = (loc && (loc.slug || loc.id)) || fallbackSlug || '';
        return slug ? '/' + slug + '#newsletter' : '/locations#newsletter';
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
            if (groupUrl) return groupUrl;
            return '';
        }

        var externalUrl = getExternalLocationUrl(loc);
        if (externalUrl) return externalUrl;
        if (opts.preferLocationPageFlow && slug) return '/' + slug + '?book=1';
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

    function shouldUseBookingFrame(kind, href) {
        var normalizedKind = normalizeKind(kind);
        return isExternalHttpUrl(href) && (normalizedKind === 'tickets' || normalizedKind === 'groups');
    }

    function shouldUseRollerCheckout(loc, href, kind) {
        if (!loc || normalizeKind(kind) !== 'tickets') return false;
        var roller = (loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        return !!roller && href === roller;
    }

    function bookingPresentationFor(loc, kind, href) {
        if (!isNavigableHref(href)) return 'panel';
        if (isLocationExternalSiteUrl(loc, href)) return 'external-site';
        if (isTicketKind(kind) && shouldUseRollerCheckout(loc, href, kind)) return 'roller';
        if (shouldUseBookingFrame(kind, href)) return 'iframe';
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
        var presentation = bookingPresentationFor(loc, kind, href);
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
        var trigger = intent.usesBookingFrame || intent.usesRollerCheckout;
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
        if (!opts.deferUntilLoad && (resolved.usesRollerCheckout || resolved.presentation === 'roller')) {
            return { type: 'roller', href: href, shouldPreventDefault: true, trackCheckout: isExternalHttpUrl(href) };
        }
        if (!opts.deferUntilLoad && (resolved.usesBookingFrame || resolved.presentation === 'iframe')) {
            return { type: 'iframe', href: href, shouldPreventDefault: true, trackCheckout: isExternalHttpUrl(href) };
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
        if (resolved.usesBookingFrame || resolved.usesRollerCheckout) {
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
