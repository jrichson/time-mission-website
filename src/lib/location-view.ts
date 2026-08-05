import type { LocationRecord } from '../data/locations';
import {
    hasTicketBooking,
    locationDisplayStatus,
    locationOpeningLabel,
    locationTemporaryClosureLabel,
} from './location-status';

export interface LocationContactItem {
    kind: 'phone' | 'email';
    label: string;
}

export interface LocationHoursRow {
    day: string;
    label: string;
}

export interface LocationCtaView {
    href: string;
    isBookingTrigger: boolean;
    label: string;
    i18n: string;
}

export interface LocationViewModel {
    addressText: string;
    bookLabel: string;
    bookable: boolean;
    externalUrl: string;
    id: string;
    openingLabel: string;
    pageUrl: string;
    slug: string;
    status: LocationRecord['status'];
}

const locationDayOrder = [
    ['mon', 'Monday'],
    ['tue', 'Tuesday'],
    ['wed', 'Wednesday'],
    ['thu', 'Thursday'],
    ['fri', 'Friday'],
    ['sat', 'Saturday'],
    ['sun', 'Sunday'],
] as const;

export function locationSlug(loc: Pick<LocationRecord, 'id' | 'slug'>): string {
    return loc.slug || loc.id;
}

export function locationHref(loc: Pick<LocationRecord, 'externalUrl' | 'id' | 'pagePath' | 'slug'>): string {
    return loc.pagePath || loc.externalUrl || `/${locationSlug(loc)}`;
}

export function locationHrefIsExternal(
    loc: Pick<LocationRecord, 'externalUrl' | 'id' | 'pagePath' | 'slug'>,
): boolean {
    return /^https?:\/\//i.test(locationHref(loc));
}

export function locationAddressText(loc: Pick<LocationRecord, 'address'>, separator = ', '): string {
    const address = loc.address;
    const cityLine = [address.city, address.state].filter(Boolean).join(', ');
    const postalLine = [cityLine, address.zip].filter(Boolean).join(' ');
    return [address.line1, address.line2, postalLine, address.country].filter(Boolean).join(separator);
}

export function locationAddressLines(loc: Pick<LocationRecord, 'address'> | null | undefined): string[] {
    if (!loc) return [];
    const address = loc.address;
    const cityLine = [address.city, address.state].filter(Boolean).join(', ');
    const postalLine = [cityLine, address.zip].filter(Boolean).join(' ');
    return [address.line1, address.line2, postalLine].filter((line): line is string => Boolean(line));
}

export function locationStateBadge(loc: Pick<LocationRecord, 'address' | 'region'>): string {
    if (loc.address.state && loc.address.state.trim()) return loc.address.state;
    if (loc.region === 'europe') return 'BE';
    return '--';
}

export function locationStatusBadge(loc: LocationRecord): string {
    const closureLabel = locationTemporaryClosureLabel(loc);
    if (closureLabel) return closureLabel;
    if (loc.status !== 'coming-soon') return '';
    return locationOpeningLabel(loc) || 'Coming Soon';
}

export function locationContactItems(loc: Pick<LocationRecord, 'contact'>): LocationContactItem[] {
    const phone = String(loc.contact.phone || '').trim();
    const email = String(loc.contact.email || '').trim();
    const items: LocationContactItem[] = [];
    if (phone) items.push({ label: phone, kind: 'phone' });
    if (email) items.push({ label: email, kind: 'email' });
    return items;
}

export function locationPhoneHref(loc: Pick<LocationRecord, 'contact'> | null | undefined): string {
    const phone = String(loc?.contact.phone || '').trim();
    if (!phone) return '';
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function locationContactHref(loc: Pick<LocationRecord, 'slug'>, type = 'updates'): string {
    const params = new URLSearchParams();
    params.set('location', loc.slug);
    params.set('type', type);
    return `/contact#${params.toString()}`;
}

export function locationFirstAccessUrl(loc: Pick<LocationRecord, 'firstAccessUrl'>): string {
    return String(loc.firstAccessUrl || '').trim();
}

export function locationMarket(loc: Pick<LocationRecord, 'address'>): string {
    return [loc.address.city, loc.address.state || loc.address.country].filter(Boolean).join(', ');
}

export function locationHoursRows(loc: Pick<LocationRecord, 'hours' | 'status'> | null | undefined): LocationHoursRow[] {
    if (!loc) return [];
    if (loc.status === 'temporarily-closed') return [];
    return locationDayOrder.flatMap(([key, day]) => {
        const label = loc.hours?.[key]?.label;
        return label ? [{ day, label }] : [];
    });
}

function locationOverlayAddressText(loc: Pick<LocationRecord, 'address'>): string {
    const cityLine = [loc.address.city, loc.address.state].filter(Boolean).join(', ');
    const postalLine = [cityLine, loc.address.zip].filter(Boolean).join(' ');
    return [loc.address.line1, loc.address.line2, postalLine].filter(Boolean).join('\n');
}

export function locationCtaView(loc: LocationRecord): LocationCtaView {
    if (loc.status === 'temporarily-closed') {
        return {
            href: locationContactHref(loc, 'closure'),
            isBookingTrigger: false,
            label: loc.temporaryClosure?.ctaLabel || 'Get Closure Updates',
            i18n: '',
        };
    }
    const firstAccessUrl = locationFirstAccessUrl(loc);
    if (firstAccessUrl) {
        return {
            href: firstAccessUrl,
            isBookingTrigger: false,
            label: 'First Access',
            i18n: 'location.firstAccess',
        };
    }
    const externalUrl = String(loc.externalUrl || '').trim();
    if (externalUrl) {
        return {
            href: externalUrl,
            isBookingTrigger: false,
            label: loc.region === 'europe' ? 'Visit EU Site' : 'Visit Location Site',
            i18n: loc.region === 'europe' ? 'location.visitEuSite' : 'location.visitLocationSite',
        };
    }
    const isBookable = hasTicketBooking(loc);
    if (isBookable) {
        return {
            href: '#',
            isBookingTrigger: true,
            label: 'Book Now',
            i18n: 'nav.bookNow',
        };
    }
    return {
        href: locationContactHref(loc),
        isBookingTrigger: false,
        label: 'Contact Us',
        i18n: '',
    };
}

export function locationViewModel(loc: LocationRecord): LocationViewModel {
    const bookable = hasTicketBooking(loc);
    const firstAccessUrl = locationFirstAccessUrl(loc);
    const externalUrl = String(loc.externalUrl || '').trim();
    const externalSiteLabel = loc.region === 'europe' ? 'Visit EU Site' : 'Visit Location Site';
    const comingSoon = loc.status === 'coming-soon';
    const temporarilyClosed = loc.status === 'temporarily-closed';

    return {
        addressText: locationOverlayAddressText(loc),
        bookLabel: temporarilyClosed
            ? loc.temporaryClosure?.ctaLabel || 'Get Closure Updates'
            : firstAccessUrl
            ? 'First Access'
            : externalUrl
            ? externalSiteLabel
            : (bookable || !comingSoon ? 'Book Now' : 'Contact Us'),
        bookable,
        externalUrl,
        id: loc.id || locationSlug(loc),
        openingLabel: locationOpeningLabel(loc),
        pageUrl: locationHref(loc),
        slug: locationSlug(loc),
        status: loc.status,
    };
}

export function locationHeadlineStatus(loc: LocationRecord): string {
    return locationDisplayStatus(loc);
}
