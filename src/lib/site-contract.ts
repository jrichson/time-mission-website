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
    ticketPanel: { options: TicketPanelOption[] };
    analytics: typeof analyticsLabels;
    smokeHints: {
        ticketOptionCount: number;
        overlaySampleSlug: string;
        overlaySampleDataCity: string;
    };
}

export function compileSiteContract(mode: SiteContractMode): SiteContractSnapshot {
    const options = ticketPanelSelectOptions(allLocations);
    const philly = allLocations.find((l) => l.slug === 'philadelphia' || l.id === 'philadelphia');
    return {
        version: 1,
        mode,
        ticketPanel: { options },
        analytics: analyticsLabels,
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
    ticketOptionCount: number;
    ticketOptionIds: string[];
    /** Hash of sorted id:status roster; client recomputes from fetched locations.json after load(). */
    locationsFingerprint: string;
    analytics: {
        eventNameCount: number;
        parameterCount: number;
        fingerprint: string;
    };
}

export function getPublicSiteContract(): PublicSiteContract {
    const snapshot = compileSiteContract('build');
    return {
        version: 1,
        ticketOptionCount: snapshot.ticketPanel.options.length,
        ticketOptionIds: snapshot.ticketPanel.options.map((o) => o.value),
        locationsFingerprint: locationsFingerprintFromRecords(allLocations),
        analytics: {
            eventNameCount: Object.keys(snapshot.analytics.eventNames).length,
            parameterCount: Object.keys(snapshot.analytics.parameters).length,
            fingerprint: fingerprintAnalyticsLabels(snapshot.analytics),
        },
    };
}
