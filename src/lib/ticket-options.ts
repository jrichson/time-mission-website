import type { LocationRecord } from '../data/locations';
import { hasTicketBooking, locationOpeningLabel } from './location-status';

export type TicketPanelOption = {
    value: string;
    label: string;
    status: string;
};

/** Single source for ticket panel `<select>` options (SSR, checks, and browser via locations.js mirror). */
export function ticketPanelSelectOptions(locations: LocationRecord[]): TicketPanelOption[] {
    return locations
        .filter((loc) => !loc.externalUrl)
        .map((loc) => ({
            value: loc.id,
            label:
                (loc.shortName || loc.name || loc.id) +
                (loc.status === 'coming-soon'
                    ? ` (${locationOpeningLabel(loc) || (hasTicketBooking(loc) ? 'Booking Now' : 'Coming Soon')})`
                    : ''),
            status: loc.status || 'open',
        }));
}
