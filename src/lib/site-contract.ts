/**
 * Site contract: single derived view of durable facts for build, runtime, and checks.
 * Ticket option rules: src/lib/ticket-options.ts (ticketPanelSelectOptions).
 */
import { allLocations } from '../data/locations';
import analyticsLabels from '../data/site/analytics-labels.json';
import { fingerprintAnalyticsLabels } from './analytics-labels-fingerprint';
import { locationsFingerprintFromRecords } from './locations-fingerprint';
import { locationScopedCanonicalPaths } from './public-url-surface';
import { activeSiteProfile } from './site-profile';
import { ticketPanelSelectOptions, type TicketPanelOption } from './ticket-options';

export type SiteContractMode = 'sources' | 'build';

export type { TicketPanelOption };

export { ticketPanelSelectOptions };

export interface SiteContractSnapshot {
    version: 1;
    mode: SiteContractMode;
    locations: {
        roster: Array<{
            id: string;
            slug: string;
            status: string;
            external: boolean;
        }>;
        fingerprint: string;
    };
    ticketPanel: { options: TicketPanelOption[] };
    booking: {
        ticketOptionIds: string[];
        externalLocationIds: string[];
        iframeKinds: Array<'groups'>;
    };
    analytics: typeof analyticsLabels;
    runtime: {
        locationStorageKey: 'tm_location';
        locationChangeEvent: 'tm:location-changed';
        locationScopedPaths: string[];
    };
    smokeHints: {
        ticketOptionCount: number;
        overlaySampleSlug: string;
        overlaySampleDataCity: string;
    };
}

function locationScopedPaths(): string[] {
    return locationScopedCanonicalPaths(allLocations.map((loc) => `/${loc.slug || loc.id}`));
}

export function compileSiteContract(mode: SiteContractMode): SiteContractSnapshot {
    const options = ticketPanelSelectOptions(allLocations, activeSiteProfile.internalRegion);
    const overlaySample = allLocations.find((l) => l.status === 'open' && !l.externalUrl) || allLocations[0];
    const roster = allLocations.map((loc) => ({
        id: loc.id,
        slug: loc.slug,
        status: loc.status || 'open',
        external: Boolean(loc.externalUrl),
    }));
    const externalLocationIds = roster.filter((loc) => loc.external).map((loc) => loc.id);
    return {
        version: 1,
        mode,
        locations: {
            roster,
            fingerprint: locationsFingerprintFromRecords(allLocations),
        },
        ticketPanel: { options },
        booking: {
            ticketOptionIds: options.map((option) => option.value),
            externalLocationIds,
            iframeKinds: ['groups'],
        },
        analytics: analyticsLabels,
        runtime: {
            locationStorageKey: 'tm_location',
            locationChangeEvent: 'tm:location-changed',
            locationScopedPaths: locationScopedPaths(),
        },
        smokeHints: {
            ticketOptionCount: options.length,
            overlaySampleSlug: overlaySample?.slug ?? 'mount-prospect',
            overlaySampleDataCity: overlaySample?.shortName ?? 'Mount Prospect',
        },
    };
}

/** Narrow, JSON-safe payload embedded before deferred runtime scripts (see SiteScripts). */
export interface PublicSiteContract {
    version: 1;
    locationIds: string[];
    externalLocationIds: string[];
    ticketOptionCount: number;
    ticketOptionIds: string[];
    booking: {
        iframeKinds: Array<'groups'>;
        locationPromptRequired: true;
    };
    /** Hash of sorted id:status roster; client recomputes from fetched locations.json after load(). */
    locationsFingerprint: string;
    analytics: {
        eventNameCount: number;
        parameterCount: number;
        fingerprint: string;
    };
    runtime: {
        locationStorageKey: 'tm_location';
        locationChangeEvent: 'tm:location-changed';
        locationScopedPaths: string[];
    };
}

export function getPublicSiteContract(): PublicSiteContract {
    const snapshot = compileSiteContract('build');
    return {
        version: 1,
        locationIds: snapshot.locations.roster.map((loc) => loc.id),
        externalLocationIds: snapshot.booking.externalLocationIds,
        ticketOptionCount: snapshot.ticketPanel.options.length,
        ticketOptionIds: snapshot.booking.ticketOptionIds,
        booking: {
            iframeKinds: snapshot.booking.iframeKinds,
            locationPromptRequired: true,
        },
        locationsFingerprint: snapshot.locations.fingerprint,
        analytics: {
            eventNameCount: Object.keys(snapshot.analytics.eventNames).length,
            parameterCount: Object.keys(snapshot.analytics.parameters).length,
            fingerprint: fingerprintAnalyticsLabels(snapshot.analytics),
        },
        runtime: snapshot.runtime,
    };
}
