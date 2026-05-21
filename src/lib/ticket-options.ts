import type { LocationRecord } from '../data/locations';
import { hasTicketBooking } from './location-status';
import { locationStatusBadge } from './location-view';

export type TicketPanelOption = {
    value: string;
    label: string;
    status: string;
};

/** Single source for ticket panel `<select>` options (SSR, checks, and browser via locations.js mirror). */
export function ticketPanelSelectOptions(locations: LocationRecord[]): TicketPanelOption[] {
    return locations
        .map((loc) => ({
            value: loc.id,
            label:
                (loc.region === 'europe'
                    ? loc.navLabel || loc.shortName || loc.name || loc.id
                    : loc.shortName || loc.name || loc.id) +
                (loc.status === 'coming-soon'
                    ? ` (${locationStatusBadge(loc) || (hasTicketBooking(loc) ? 'Booking Now' : 'Coming Soon')})`
                    : ''),
            status: loc.status || 'open',
        }));
}
