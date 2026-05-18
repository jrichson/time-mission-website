/**
 * Site contract (RFC #9): single derived view of durable facts for build, runtime, and checks.
 * Ticket option rules: src/lib/ticket-options.ts (ticketPanelSelectOptions).
 */
import { allLocations } from '../data/locations';
import analyticsLabels from '../data/site/analytics-labels.json';
import { fingerprintAnalyticsLabels } from './analytics-labels-fingerprint';
import { locationsFingerprintFromRecords } from './locations-fingerprint';
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
        iframeKinds: ['tickets', 'groups'];
    };
    analytics: typeof analyticsLabels;
    runtime: {
        locationStorageKey: 'tm_location';
        locationChangeEvent: 'tm:location-changed';
    };
    smokeHints: {
        ticketOptionCount: number;
        overlaySampleSlug: string;
        overlaySampleDataCity: string;
    };
}

export function compileSiteContract(mode: SiteContractMode): SiteContractSnapshot {
    const options = ticketPanelSelectOptions(allLocations);
    const philly = allLocations.find((l) => l.slug === 'philadelphia' || l.id === 'philadelphia');
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
            iframeKinds: ['tickets', 'groups'],
        },
        analytics: analyticsLabels,
        runtime: {
            locationStorageKey: 'tm_location',
            locationChangeEvent: 'tm:location-changed',
        },
        smokeHints: {
            ticketOptionCount: options.length,
            overlaySampleSlug: philly?.slug ?? 'philadelphia',
            overlaySampleDataCity: philly?.shortName ?? 'Philadelphia',
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
        iframeKinds: ['tickets', 'groups'];
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
