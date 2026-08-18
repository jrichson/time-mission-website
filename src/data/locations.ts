import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fallbackLocationsJson from '../../data/locations.json';
import groupTypesConfig from '../../config/group-types.cjs';
import {
    activeSiteProfile,
    locationsDocumentProfileState,
    profileLocationsDocument,
} from '../lib/site-profile';

export type GroupTypeId = keyof typeof groupTypesConfig.GROUP_TYPES;

export interface LocationDayHours {
    open?: string;
    close?: string;
    label: string;
}

export interface LocationRecord {
    id: string;
    slug: string;
    name: string;
    shortName: string;
    venueName: string | null;
    region: string;
    status: 'open' | 'coming-soon' | 'temporarily-closed';
    temporaryClosure?: {
        label: string;
        title: string;
        summary: string;
        detail: string;
        ctaLabel: string;
        contactLabel: string;
    };
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
    geo?: {
        latitude: number;
        longitude: number;
    } | null;
    contact: {
        phone: string;
        email: string;
    };
    hours: Record<string, LocationDayHours>;
    teamSize?: {
        min: number;
        max: number;
    };
    bookingUrl: string;
    donationUrl?: string;
    externalUrl?: string;
    counterpartUrl?: string;
    pagePath?: string;
    rollerCheckoutUrl?: string;
    groupCheckoutUrl?: string;
    groupCheckoutUrls?: Partial<Record<GroupTypeId, string>>;
    groupInquiryLabels?: Partial<Record<GroupTypeId, string>>;
    bookingProvider?: 'roller' | 'briq' | 'clubspeed' | 'experience-factory';
    briqWidgetDomain?: string;
    briqWidget?: {
        domain: string;
        color1Base: string;
        color1Contrast: string;
        color2Base: string;
        color2Contrast: string;
        priceDisplay: string;
        buttonText: string;
    };
    groupFormUrls?: Record<string, string>;
    navLabel: string;
    mapUrl: string;
    faqs: unknown[];
    ticker: string;
    giftCardUrl: string;
    waiverUrl?: string;
    countryCode: string | null;
    locale: string | null;
    timeZone: string | null;
    currency: string | null;
    phoneE164: string | null;
    hreflang: Array<{ lang: string; url: string }> | null;
    localBusinessSchemaEligible: boolean;
    alternateName?: string;
    openingDate?: string;
    openingLabel?: string;
    hiddenMissionIds?: string[];
}

export interface LocationsDocument {
    locations: LocationRecord[];
    siteProfile?: 'us' | 'eu';
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function resolvedLocationsPath(): string {
    const configuredPath = typeof process !== 'undefined' ? process.env.TM_RESOLVED_LOCATIONS_PATH : '';
    const cleanedPath = typeof configuredPath === 'string' ? configuredPath.trim() : '';
    if (!cleanedPath) return '';

    return path.isAbsolute(cleanedPath) ? cleanedPath : path.resolve(repoRoot, cleanedPath);
}

const locationDataPath = resolvedLocationsPath();

interface LoadedLocationsDocument {
    alreadyProfiled: boolean;
    document: LocationsDocument;
}

function readLocationsDocument(): LoadedLocationsDocument {
    if (!locationDataPath) {
        return {
            alreadyProfiled: false,
            document: fallbackLocationsJson as LocationsDocument,
        };
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(locationDataPath, 'utf8')) as LocationsDocument;
        if (Array.isArray(parsed?.locations)) {
            const profileState = locationsDocumentProfileState(parsed, activeSiteProfile);
            if (profileState !== 'mismatched') {
                return {
                    alreadyProfiled: profileState === 'profiled',
                    document: parsed,
                };
            }
            console.warn(
                `[locations] resolved location data is for ${parsed.siteProfile}; using ${activeSiteProfile.id} code-owned fallback`,
            );
        }
    } catch (err) {
        console.warn(
            '[locations] failed to read resolved location data; using code-owned fallback:',
            err instanceof Error ? err.message : err,
        );
    }

    return {
        alreadyProfiled: false,
        document: fallbackLocationsJson as LocationsDocument,
    };
}

const sourceLocations = readLocationsDocument();
export const locationsDocument = profileLocationsDocument(sourceLocations.document, {
    alreadyProfiled: sourceLocations.alreadyProfiled,
    profile: activeSiteProfile,
}) as LocationsDocument;
export const allLocations = locationsDocument.locations;
