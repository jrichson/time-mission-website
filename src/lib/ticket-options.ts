import type { LocationRecord } from '../data/locations';
import { locationListLabel, sortLocationsForList } from './location-list';
import { hasTicketBooking } from './location-status';
import { locationStatusBadge } from './location-view';

export type TicketPanelOption = {
    value: string;
    label: string;
    status: string;
};

/** Single source for ticket panel `<select>` options (SSR, checks, and browser via locations.js mirror). */
export function ticketPanelSelectOptions(locations: LocationRecord[]): TicketPanelOption[] {
    return sortLocationsForList(locations)
        .map((loc) => ({
            value: loc.id,
            label:
                locationListLabel(loc) +
                (loc.status !== 'open'
                    ? ` (${locationStatusBadge(loc) || (hasTicketBooking(loc) ? 'Booking Now' : 'Coming Soon')})`
                    : ''),
            status: loc.status || 'open',
        }));
}
