import type { LocationRecord } from '../data/locations';

type LocationStatusFields = Pick<
    LocationRecord,
    'bookingUrl' | 'openingDate' | 'openingLabel' | 'rollerCheckoutUrl' | 'status'
>;

export function hasTicketBooking(loc: LocationStatusFields): boolean {
    return Boolean(String(loc.rollerCheckoutUrl || loc.bookingUrl || '').trim());
}

export function locationOpeningLabel(loc: Pick<LocationRecord, 'openingDate' | 'openingLabel'>): string {
    const explicit = String(loc.openingLabel || '').trim();
    if (explicit) return explicit;

    const iso = String(loc.openingDate || '').trim();
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';

    return `Opening ${Number(match[2])}/${Number(match[3])}/${match[1].slice(2)}`;
}

export function locationOpeningDateText(loc: Pick<LocationRecord, 'openingDate' | 'openingLabel'>): string {
    return locationOpeningLabel(loc).replace(/^Opening\s+/i, '');
}

export function locationDisplayStatus(loc: LocationStatusFields): string {
    const openingLabel = locationOpeningLabel(loc);
    if (openingLabel) return openingLabel;
    if (loc.status === 'coming-soon') return hasTicketBooking(loc) ? 'Booking Now' : 'Coming Soon';
    return 'Now booking';
}
