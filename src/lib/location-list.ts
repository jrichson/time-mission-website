import type { LocationRecord } from '../data/locations';

const REGION_ORDER: Record<string, number> = {
    us: 0,
    europe: 1,
};

export type LocationRegion = 'us' | 'europe';

export function orderedLocationRegions(primaryRegion: string): LocationRegion[] {
    return primaryRegion === 'europe' ? ['europe', 'us'] : ['us', 'europe'];
}

function cityName(loc: LocationRecord): string {
    return loc.shortName || loc.address.city || loc.name || loc.id;
}

function regionLabel(loc: LocationRecord): string {
    if (loc.region === 'europe') {
        return loc.address.country || loc.countryCode || 'Europe';
    }

    return loc.address.state || loc.countryCode || loc.region.toUpperCase();
}

function sortKey(loc: LocationRecord): string {
    return [
        REGION_ORDER[loc.region] ?? 99,
        regionLabel(loc).toLocaleUpperCase('en-US'),
        cityName(loc).toLocaleUpperCase('en-US'),
    ].join('|');
}

export function locationListLabel(loc: LocationRecord): string {
    return `${regionLabel(loc)} – ${cityName(loc)}`;
}

export function sortLocationsForList(locations: LocationRecord[]): LocationRecord[] {
    return locations.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'en-US'));
}

export function locationsForRegion(locations: LocationRecord[], region: string): LocationRecord[] {
    return sortLocationsForList(locations.filter((loc) => loc.region === region));
}
