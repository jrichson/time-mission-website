import type { LocationRecord } from '../data/locations';

export const DEFAULT_LOCATION_TEAM_SIZE = {
    min: 2,
    max: 5,
} as const;

export function locationTeamSize(location?: Pick<LocationRecord, 'teamSize'> | null) {
    return location?.teamSize ?? DEFAULT_LOCATION_TEAM_SIZE;
}

export function locationTeamSizeLabel(location?: Pick<LocationRecord, 'teamSize'> | null): string {
    const teamSize = locationTeamSize(location);
    return `${teamSize.min}-${teamSize.max}`;
}
