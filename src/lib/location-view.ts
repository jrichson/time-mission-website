import type { LocationRecord } from '../data/locations';
import { hasTicketBooking, locationDisplayStatus, locationOpeningLabel } from './location-status';

export interface LocationContactItem {
    kind: 'phone' | 'email';
    label: string;
}

export interface LocationCtaView {
    href: string;
    isBookingTrigger: boolean;
    label: string;
    i18n: string;
}

export function locationSlug(loc: Pick<LocationRecord, 'id' | 'slug'>): string {
    return loc.slug || loc.id;
}

export function locationHref(loc: Pick<LocationRecord, 'externalUrl' | 'id' | 'slug'>): string {
    return loc.externalUrl || `/${locationSlug(loc)}`;
}

export function locationAddressText(loc: Pick<LocationRecord, 'address'>, separator = ', '): string {
    const address = loc.address;
    const cityLine = [address.city, address.state].filter(Boolean).join(', ');
    const postalLine = [cityLine, address.zip].filter(Boolean).join(' ');
    return [address.line1, address.line2, postalLine, address.country].filter(Boolean).join(separator);
}

export function locationStateBadge(loc: Pick<LocationRecord, 'address' | 'region'>): string {
    if (loc.address.state && loc.address.state.trim()) return loc.address.state;
    if (loc.region === 'europe') return 'BE';
    return '--';
}

export function locationStatusBadge(loc: LocationRecord): string {
    if (loc.status !== 'coming-soon') return '';
    return locationOpeningLabel(loc) || 'Coming Soon';
}

export function locationContactItems(loc: Pick<LocationRecord, 'contact'>): LocationContactItem[] {
    const phone = String(loc.contact.phone || '').trim();
    const email = String(loc.contact.email || '').trim();
    return [
        phone ? { label: phone, kind: 'phone' as const } : null,
        email ? { label: email, kind: 'email' as const } : null,
    ].filter((item): item is LocationContactItem => Boolean(item));
}

export function locationContactHref(loc: Pick<LocationRecord, 'slug'>, type = 'updates'): string {
    const params = new URLSearchParams();
    params.set('location', loc.slug);
    params.set('type', type);
    return `/contact#${params.toString()}`;
}

export function locationMarket(loc: Pick<LocationRecord, 'address'>): string {
    return [loc.address.city, loc.address.state || loc.address.country].filter(Boolean).join(', ');
}

export function locationCtaView(loc: LocationRecord): LocationCtaView {
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

export function locationHeadlineStatus(loc: LocationRecord): string {
    return locationDisplayStatus(loc);
}
