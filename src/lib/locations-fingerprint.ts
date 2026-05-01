import type { LocationRecord } from '../data/locations';

/**
 * Stable fingerprint for location roster + status (build vs runtime drift detection).
 * Must match the algorithm in js/locations.js (fingerprintRuntimeLocations).
 */
export function locationsFingerprintFromRecords(locs: Pick<LocationRecord, 'id' | 'status'>[]): string {
    const sorted = [...locs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    let h = 5381;
    for (const loc of sorted) {
        const chunk = `${loc.id}:${loc.status || 'open'}|`;
        for (let i = 0; i < chunk.length; i++) {
            h = (Math.imul(33, h) + chunk.charCodeAt(i)) >>> 0;
        }
    }
    return ('00000000' + h.toString(16)).slice(-8);
}
