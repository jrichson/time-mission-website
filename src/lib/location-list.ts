import type { LocationRecord } from '../data/locations';

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

function regionOrder(region: string, primaryRegion: string): number {
    if (region === primaryRegion) return 0;
    if (region === 'us' || region === 'europe') return 1;
    return 99;
}

function sortKey(loc: LocationRecord, primaryRegion: string): string {
    return [
        regionOrder(loc.region, primaryRegion),
        regionLabel(loc).toLocaleUpperCase('en-US'),
        cityName(loc).toLocaleUpperCase('en-US'),
    ].join('|');
}

export function locationListLabel(loc: LocationRecord): string {
    return `${regionLabel(loc)} – ${cityName(loc)}`;
}

export function sortLocationsForList(locations: LocationRecord[], primaryRegion = 'us'): LocationRecord[] {
    return locations
        .slice()
        .sort((a, b) => sortKey(a, primaryRegion).localeCompare(sortKey(b, primaryRegion), 'en-US'));
}

export function locationsForRegion(locations: LocationRecord[], region: string): LocationRecord[] {
    return sortLocationsForList(locations.filter((loc) => loc.region === region));
}
