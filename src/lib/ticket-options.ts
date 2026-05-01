import type { LocationRecord } from '../data/locations';

export type TicketPanelOption = {
    value: string;
    label: string;
    status: string;
};

/** Single source for ticket panel `<select>` options (SSR, checks, and browser via locations.js mirror). */
export function ticketPanelSelectOptions(locations: LocationRecord[]): TicketPanelOption[] {
    return locations.map((loc) => ({
        value: loc.id,
        label:
            (loc.shortName || loc.name || loc.id) +
            (loc.status === 'coming-soon' ? ' (Coming Soon)' : ''),
        status: loc.status || 'open',
    }));
}
