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

    function contactLeadUrl(slug, type) {
        var params = new URLSearchParams();
        if (slug) params.set('location', slug);
        if (type) params.set('type', type);
        var fragment = params.toString();
        return '/contact' + (fragment ? '#' + fragment : '');
    }

    function isNavigableHref(href) {
        var value = String(href || '').trim();
        return !!value && value !== '#' && !/^javascript:/i.test(value);
    }

    function isExternalHttpUrl(href) {
        return /^https?:\/\//i.test(String(href || '').trim());
    }

    function externalLinkAttributes(href) {
        return isExternalHttpUrl(href)
            ? { target: '_blank', rel: 'noopener' }
            : { target: '', rel: '' };
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

    function resolveGroupCheckoutUrl(loc, groupType) {
        if (!loc) return '';
        var normalizedGroupType = normalizeGroupType(groupType || '');
        var groupCheckoutUrls = loc.groupCheckoutUrls || {};
        var typedCheckout = normalizedGroupType
            ? String(groupCheckoutUrls[normalizedGroupType] || '').trim()
            : '';
        var groupCheckout = (loc.groupCheckoutUrl && String(loc.groupCheckoutUrl).trim()) || '';
        return typedCheckout || groupCheckout || resolveOpenCheckoutUrl(loc);
    }

    function resolveGroupInquiryLabel(loc, groupType, fallback) {
        var normalizedGroupType = normalizeGroupType(groupType || '');
        var labels = (loc && loc.groupInquiryLabels) || {};
        return (normalizedGroupType && String(labels[normalizedGroupType] || '').trim())
            || String(fallback || '').trim();
    }

    function isTemporarilyClosedLocation(loc) {
        return !!(loc && loc.status === 'temporarily-closed');
    }

    function temporaryClosureCtaLabel(loc) {
        return (loc && loc.temporaryClosure && String(loc.temporaryClosure.ctaLabel || '').trim()) || 'Get Closure Updates';
    }

    function getExternalLocationUrl(loc) {
        return (loc && loc.externalUrl && String(loc.externalUrl).trim()) || '';
    }

    function isBookableLocation(loc) {
        if (isTemporarilyClosedLocation(loc)) return false;
        return !!resolveOpenCheckoutUrl(loc);
    }

    function isLeadOnlyComingSoon(loc) {
        return !!(loc && loc.status === 'coming-soon' && !isBookableLocation(loc));
    }

    function isBriqWidgetLocation(loc) {
        return !!(loc && loc.bookingProvider === 'briq' && loc.briqWidget);
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

    function briqWidgetDestination(loc, slug, fallbackHref) {
        if (isBriqWidgetLocation(loc)) return '#briq-widget-container';
        return slug ? appendTrackingParams('/' + slug + '?book=1', { includeInternal: true }) : fallbackHref;
    }

    function resolveComingSoonLeadUrl(loc, fallbackSlug) {
        var slug = (loc && (loc.slug || loc.id)) || fallbackSlug || '';
        return contactLeadUrl(slug, 'updates');
    }

    function resolveLocationDestination(loc, options) {
        var opts = options || {};
        if (!loc) return '';
        var kind = normalizeKind(opts.kind || 'tickets');
        var slug = loc.slug || loc.id || normalizeLocation(opts.locationId || opts.pageLocationSlug || '');
        var externalUrl = getExternalLocationUrl(loc);
        if (externalUrl && !loc.pagePath) return externalUrl;
        var checkoutUrl = resolveOpenCheckoutUrl(loc);
        var bookable = !!checkoutUrl;

        if (isTemporarilyClosedLocation(loc)) {
            return contactLeadUrl(slug, 'closure');
        }

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
                return briqWidgetDestination(loc, slug, groupUrl);
            }
            if (groupUrl) return groupUrl;
            return '';
        }

        if (kind === 'group-tickets') {
            var resolvedGroupCheckoutUrl = resolveGroupCheckoutUrl(loc, opts.groupType || opts.pageGroupType || '');
            if (isBriqProviderUrl(loc, resolvedGroupCheckoutUrl)) {
                return briqWidgetDestination(loc, slug, resolvedGroupCheckoutUrl);
            }
            if (resolvedGroupCheckoutUrl) return resolvedGroupCheckoutUrl;
        }

        if (isBriqWidgetLocation(loc)) {
            return briqWidgetDestination(loc, slug, checkoutUrl);
        }
        if (opts.preferLocationPageFlow && slug) {
            return appendTrackingParams('/' + slug + '?book=1', { includeInternal: true });
        }
        if (isTicketKind(kind) && bookable) return checkoutUrl;
        if (externalUrl) return externalUrl;
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

    function isGroupTicketKind(kind) {
        return normalizeKind(kind) === 'group-tickets';
    }

    function shouldUseRollerCheckout(loc, href, kind) {
        if (!loc || !(isTicketKind(kind) || isGroupTicketKind(kind))) return false;
        var roller = (loc.rollerCheckoutUrl && String(loc.rollerCheckoutUrl).trim()) || '';
        var groupCheckout = (loc.groupCheckoutUrl && String(loc.groupCheckoutUrl).trim()) || '';
        var typedGroupCheckouts = Object.values(loc.groupCheckoutUrls || {}).map(function (value) {
            return String(value || '').trim();
        });
        return !!roller && (href === roller || href === groupCheckout || typedGroupCheckouts.indexOf(href) !== -1);
    }

    function shouldUseBriqWidget(loc, href, kind) {
        var normalizedKind = normalizeKind(kind);
        return (normalizedKind === 'tickets' || normalizedKind === 'groups' || normalizedKind === 'group-tickets')
            && isBriqWidgetLocation(loc)
            && String(href || '').trim() === '#briq-widget-container';
    }

    function shouldAppendTrackingForPresentation(presentation) {
        return presentation === 'link'
            || presentation === 'external-site'
            || presentation === 'iframe';
    }

    function shouldEmbedGroupForm(loc, kind, href) {
        var configuredForms = Object.values((loc && loc.groupFormUrls) || {}).map(function (url) {
            return String(url || '').trim();
        });
        return normalizeKind(kind) === 'groups'
            && loc
            && loc.groupFormPresentation === 'iframe'
            && isExternalHttpUrl(href)
            && configuredForms.indexOf(String(href || '').trim()) !== -1;
    }

    function bookingPresentationFor(loc, kind, href) {
        if (!isNavigableHref(href)) return 'panel';
        if (shouldUseBriqWidget(loc, href, kind)) return 'briq-widget';
        if (isLocationExternalSiteUrl(loc, href)) return 'external-site';
        if (shouldEmbedGroupForm(loc, kind, href)) return 'iframe';
        if ((isTicketKind(kind) || isGroupTicketKind(kind)) && shouldUseRollerCheckout(loc, href, kind)) return 'roller';
        return 'link';
    }

    function explicitBookingPresentation(currentTarget, loc, kind, href) {
        if (!currentTarget || typeof currentTarget.getAttribute !== 'function') return '';
        var requested = normalizeKind(currentTarget.getAttribute('data-tm-booking-presentation') || '');
        if (
            requested === 'roller'
            && loc
            && (loc.bookingProvider === 'roller' || loc.rollerCheckoutUrl)
            && (isTicketKind(kind) || isGroupTicketKind(kind))
            && isNavigableHref(href)
        ) {
            return 'roller';
        }
        return '';
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
        var explicitPresentation = explicitBookingPresentation(currentTarget, loc, kind, href);

        if (
            loc
            && opts.resolveHref !== false
            && !explicitPresentation
            && (isTicketKind(kind) || !isNavigableHref(href))
        ) {
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
        var presentation = explicitPresentation
            || explicitBookingPresentation(currentTarget, loc, kind, href)
            || bookingPresentationFor(loc, kind, href);
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
            label: isTemporarilyClosedLocation(loc) ? temporaryClosureCtaLabel(loc) : '',
            url: intent.href,
            trigger: trigger,
            externalLocation: intent.externalLocationSite,
            disabled: !loc || !intent.hasHref,
            presentation: intent.presentation,
            target: trigger ? '' : externalLinkAttributes(intent.href).target,
            rel: trigger ? '' : externalLinkAttributes(intent.href).rel,
        };
    }

    function resolveNavigationAction(intent, options) {
        var opts = options || {};
        var resolved = intent || {};
        var href = String(resolved.href || '').trim();
        var provider = 'link';
        var deferred = false;
        if (!isNavigableHref(href)) {
            provider = 'panel';
        } else if (resolved.externalLocationSite || resolved.presentation === 'external-site') {
            provider = 'external-site';
        } else if (resolved.usesBriqWidget || resolved.presentation === 'briq-widget') {
            provider = 'briq-widget';
        } else if (resolved.usesRollerCheckout || resolved.presentation === 'roller') {
            provider = 'roller';
        } else if (resolved.usesBookingFrame || resolved.presentation === 'iframe') {
            provider = 'iframe';
        }
        deferred = !!opts.deferUntilLoad && provider !== 'panel' && provider !== 'external-site';
        return {
            type: deferred ? 'deferred-' + provider : provider,
            provider: provider,
            href: href,
            deferred: deferred,
            shouldPreventDefault: true,
            trackCheckout: provider !== 'panel' && provider !== 'briq-widget' && isExternalHttpUrl(href),
        };
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
            target: '',
            rel: '',
        };
        if (!resolved.location) return attrs;
        attrs.disabled = !resolved.hasHref;
        attrs.locationId = (resolved.location && (resolved.location.id || resolved.location.slug)) || resolved.locationId || '';
        if (!resolved.hasHref) return attrs;
        if (resolved.externalLocationSite) {
            attrs.href = resolved.href || '#';
            Object.assign(attrs, externalLinkAttributes(attrs.href));
            return attrs;
        }
        if (resolved.usesBookingFrame || resolved.usesRollerCheckout || resolved.usesBriqWidget) {
            attrs.href = '#';
            attrs.bookingUrl = resolved.href || '';
            attrs.trigger = true;
            return attrs;
        }
        attrs.href = resolved.href || '#';
        Object.assign(attrs, externalLinkAttributes(attrs.href));
        return attrs;
    }

    function applyCtaView(el, cta) {
        if (!el || !cta) return;
        if (cta.label) {
            var updatedText = false;
            if (el.childNodes && typeof el.childNodes.forEach === 'function') {
                el.childNodes.forEach(function (node) {
                    if (node.nodeType === 3 && String(node.nodeValue || '').trim()) {
                        node.nodeValue = cta.label + ' ';
                        updatedText = true;
                    }
                });
            }
            var childCount = el.childNodes ? el.childNodes.length : 0;
            if (!updatedText && childCount === 0) el.textContent = cta.label;
            el.removeAttribute('data-i18n');
        }
        el.href = cta.href || '#';
        var linkAttrs = cta.trigger ? { target: '', rel: '' } : {
            target: cta.target || externalLinkAttributes(cta.href).target,
            rel: cta.rel || externalLinkAttributes(cta.href).rel,
        };
        if (linkAttrs.target) el.setAttribute('target', linkAttrs.target);
        else el.removeAttribute('target');
        if (linkAttrs.rel) el.setAttribute('rel', linkAttrs.rel);
        else el.removeAttribute('rel');
        if (cta.disabled) {
            el.setAttribute('aria-disabled', 'true');
            if (el.classList) el.classList.add('is-disabled');
        } else {
            el.removeAttribute('aria-disabled');
            if (el.classList) el.classList.remove('is-disabled');
        }
        if (cta.trigger) {
            el.setAttribute('data-tm-booking-trigger', '');
            el.setAttribute('data-tm-booking-kind', cta.kind || 'tickets');
            if (cta.locationId) el.setAttribute('data-tm-location', cta.locationId);
            else el.removeAttribute('data-tm-location');
            if (cta.groupType) el.setAttribute('data-tm-group-type', cta.groupType);
            else el.removeAttribute('data-tm-group-type');
            if (cta.bookingUrl) el.setAttribute('data-tm-booking-url', cta.bookingUrl);
            else el.removeAttribute('data-tm-booking-url');
            return;
        }
        el.removeAttribute('data-tm-booking-trigger');
        el.removeAttribute('data-tm-booking-kind');
        el.removeAttribute('data-tm-location');
        el.removeAttribute('data-tm-group-type');
        el.removeAttribute('data-tm-booking-url');
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
        isTemporarilyClosedLocation: isTemporarilyClosedLocation,
        temporaryClosureCtaLabel: temporaryClosureCtaLabel,
        isBookableLocation: isBookableLocation,
        isLeadOnlyComingSoon: isLeadOnlyComingSoon,
        resolveGroupCheckoutUrl: resolveGroupCheckoutUrl,
        resolveGroupInquiryLabel: resolveGroupInquiryLabel,
        resolveLocationDestination: resolveLocationDestination,
        isTicketKind: isTicketKind,
        resolveIntent: resolveIntent,
        resolveCtaView: resolveCtaView,
        resolveNavigationAction: resolveNavigationAction,
        resolveOutcome: resolveOutcome,
        ctaAttributesForIntent: ctaAttributesForIntent,
        applyCtaView: applyCtaView,
    };
})();
