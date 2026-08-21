import type { LocationDayHours, LocationRecord, LocationSpecialHours } from '../../data/locations';

export const LOCATION_HOUR_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export type LocationHourDayKey = (typeof LOCATION_HOUR_DAY_KEYS)[number];

export interface PayloadLocationDetailsAddress {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
}

export interface PayloadLocationDetailsDayHours {
    open?: string | null;
    close?: string | null;
    label?: string | null;
}

export type PayloadLocationDetailsHours = Partial<Record<LocationHourDayKey, PayloadLocationDetailsDayHours | null>>;

export interface PayloadLocationDetailsExternalLinks {
    externalUrl?: string | null;
    bookingUrl?: string | null;
    rollerCheckoutUrl?: string | null;
    giftCardUrl?: string | null;
    waiverUrl?: string | null;
}

export interface PayloadLocationDetailsGroupFormUrl {
    formKey?: string | null;
    url?: string | null;
}

export interface PayloadLocationDetailsHiddenMissionId {
    missionId?: string | null;
}

export interface PayloadLocationDetailsSpecialHours {
    date?: string | null;
    name?: string | null;
    label?: string | null;
    open?: string | null;
    close?: string | null;
}

export interface PayloadLocationDetailsDoc {
    id: string | number;
    title?: string | null;
    locationSlug?: string | null;
    published?: boolean | null;
    address?: PayloadLocationDetailsAddress | null;
    hours?: PayloadLocationDetailsHours | null;
    externalLinks?: PayloadLocationDetailsExternalLinks | null;
    groupFormUrls?: PayloadLocationDetailsGroupFormUrl[] | null;
    hiddenMissionIds?: PayloadLocationDetailsHiddenMissionId[] | null;
    specialHours?: PayloadLocationDetailsSpecialHours[] | null;
}

interface LocationDetailsPatch {
    address?: LocationRecord['address'];
    externalLinks?: Partial<
        Pick<LocationRecord, 'externalUrl' | 'bookingUrl' | 'rollerCheckoutUrl' | 'giftCardUrl' | 'waiverUrl'> & {
            groupFormUrls: Record<string, string>;
        }
    >;
    hours?: Record<string, LocationDayHours>;
    hiddenMissionIds?: string[];
    specialHours?: LocationSpecialHours[];
    mapUrl?: string;
}

const TIME_24_HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const GROUP_FORM_KEY_PATTERN = /^[a-z0-9-]+$/;
const INTERNAL_PUBLIC_PATH_PATTERN = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;
const MISSION_ID_PATTERN = /^\d{4}$/;
const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EXTERNAL_LINK_FIELDS = ['externalUrl', 'bookingUrl', 'rollerCheckoutUrl', 'giftCardUrl', 'waiverUrl'] as const;

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function cleanNullableString(value: unknown): string | undefined {
    const cleaned = cleanString(value);
    return cleaned ? cleaned : undefined;
}

function cleanTime(value: unknown): string | undefined {
    const cleaned = cleanString(value);
    return TIME_24_HOUR_PATTERN.test(cleaned) ? cleaned : undefined;
}

function cleanHttpsUrl(value: unknown): string {
    const cleaned = cleanString(value);
    if (!cleaned || cleaned.length > 2048 || /[<>"'\\\s]/.test(cleaned)) return '';

    try {
        const url = new URL(cleaned);
        if (url.protocol !== 'https:' || url.username || url.password) return '';
        return cleaned;
    } catch {
        return '';
    }
}

function cleanGroupFormUrl(value: unknown): string {
    const cleaned = cleanString(value);
    if (!cleaned || cleaned.length > 2048 || /[<>"'\\\s]/.test(cleaned)) return '';
    if (INTERNAL_PUBLIC_PATH_PATTERN.test(cleaned)) return cleaned;
    return cleanHttpsUrl(cleaned);
}

function addressPatchForDoc(doc: PayloadLocationDetailsDoc): LocationRecord['address'] | null {
    const address = doc.address;
    if (!address) return null;

    const city = cleanString(address.city);
    const country = cleanString(address.country);
    if (!city || !country) return null;

    return {
        line1: cleanString(address.line1),
        line2: cleanNullableString(address.line2),
        city,
        state: cleanString(address.state),
        zip: cleanString(address.zip),
        country,
    };
}

function mapUrlForAddress(address: LocationRecord['address']): string {
    const query = [
        address.line1,
        address.line2,
        address.city,
        address.state,
        address.zip,
        address.country,
    ]
        .map(cleanString)
        .filter(Boolean)
        .join(' ');

    return query ? `https://maps.google.com/?q=${encodeURIComponent(query)}` : '';
}

function hoursPatchForDoc(doc: PayloadLocationDetailsDoc): Record<string, LocationDayHours> | null {
    const hours = doc.hours;
    if (!hours) return null;

    const patch: Record<string, LocationDayHours> = {};
    for (const day of LOCATION_HOUR_DAY_KEYS) {
        const row = hours[day];
        const label = cleanString(row?.label);
        if (!label) continue;

        const open = cleanTime(row?.open);
        const close = cleanTime(row?.close);
        patch[day] = {
            label,
            ...(open ? { open } : {}),
            ...(close ? { close } : {}),
        };
    }

    return Object.keys(patch).length > 0 ? patch : null;
}

function groupFormUrlsPatchForDoc(doc: PayloadLocationDetailsDoc): Record<string, string> | null {
    const rows = Array.isArray(doc.groupFormUrls) ? doc.groupFormUrls : [];
    if (rows.length === 0) return null;

    const patch: Record<string, string> = {};
    for (const row of rows) {
        const formKey = cleanString(row?.formKey);
        const url = cleanGroupFormUrl(row?.url);
        if (!GROUP_FORM_KEY_PATTERN.test(formKey) || !url) continue;
        patch[formKey] = url;
    }

    return Object.keys(patch).length > 0 ? patch : null;
}

function externalLinksPatchForDoc(
    doc: PayloadLocationDetailsDoc,
): LocationDetailsPatch['externalLinks'] | null {
    const externalLinks = doc.externalLinks;
    const patch: LocationDetailsPatch['externalLinks'] = {};
    if (externalLinks) {
        for (const field of EXTERNAL_LINK_FIELDS) {
            const url = cleanHttpsUrl(externalLinks[field]);
            if (url) patch[field] = url;
        }
    }

    const groupFormUrls = groupFormUrlsPatchForDoc(doc);
    if (groupFormUrls) patch.groupFormUrls = groupFormUrls;

    return Object.keys(patch).length > 0 ? patch : null;
}

function hiddenMissionIdsPatchForDoc(doc: PayloadLocationDetailsDoc): string[] | null {
    if (!Array.isArray(doc.hiddenMissionIds)) return null;

    return Array.from(new Set(doc.hiddenMissionIds
        .map((row) => cleanString(row?.missionId))
        .filter((missionId) => MISSION_ID_PATTERN.test(missionId))));
}

function specialHoursPatchForDoc(doc: PayloadLocationDetailsDoc): LocationSpecialHours[] | null {
    if (!Array.isArray(doc.specialHours)) return null;

    const byDate = new Map<string, LocationSpecialHours>();
    for (const row of doc.specialHours) {
        const date = cleanString(row?.date);
        const name = cleanString(row?.name);
        const label = cleanString(row?.label);
        if (!CALENDAR_DATE_PATTERN.test(date) || !name || !label) continue;

        const parsedDate = new Date(`${date}T00:00:00.000Z`);
        if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) continue;

        const open = cleanTime(row?.open);
        const close = cleanTime(row?.close);
        byDate.set(date, {
            date,
            name,
            label,
            ...(open ? { open } : {}),
            ...(close ? { close } : {}),
        });
    }

    return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function patchForDoc(doc: PayloadLocationDetailsDoc): LocationDetailsPatch | null {
    if (!doc || doc.published !== true || !cleanString(doc.locationSlug)) return null;

    const address = addressPatchForDoc(doc);
    const hours = hoursPatchForDoc(doc);
    const externalLinks = externalLinksPatchForDoc(doc);
    const hiddenMissionIds = hiddenMissionIdsPatchForDoc(doc);
    const specialHours = specialHoursPatchForDoc(doc);
    if (!address && !hours && !externalLinks && hiddenMissionIds == null && specialHours == null) return null;

    return {
        ...(address ? { address } : {}),
        ...(address ? { mapUrl: mapUrlForAddress(address) } : {}),
        ...(hours ? { hours } : {}),
        ...(externalLinks ? { externalLinks } : {}),
        ...(hiddenMissionIds != null ? { hiddenMissionIds } : {}),
        ...(specialHours != null ? { specialHours } : {}),
    };
}

function addressesMatch(
    left: LocationRecord['address'],
    right: LocationRecord['address'],
): boolean {
    return ['line1', 'line2', 'city', 'state', 'zip', 'country'].every(
        (field) =>
            cleanString(left?.[field as keyof LocationRecord['address']]) ===
            cleanString(right?.[field as keyof LocationRecord['address']]),
    );
}

export function locationDetailsDocLooksUsable(doc: PayloadLocationDetailsDoc): boolean {
    return Boolean(patchForDoc(doc));
}

export function applyLocationDetailsOverrides(
    locations: LocationRecord[],
    docs: PayloadLocationDetailsDoc[] | null | undefined,
): LocationRecord[] {
    if (!Array.isArray(docs) || docs.length === 0) return locations;

    const knownSlugs = new Set(locations.map((loc) => loc.slug).filter(Boolean));
    const patches = new Map<string, LocationDetailsPatch>();
    for (const doc of docs) {
        const slug = cleanString(doc?.locationSlug);
        if (!knownSlugs.has(slug)) continue;

        const patch = patchForDoc(doc);
        if (patch) patches.set(slug, patch);
    }

    if (patches.size === 0) return locations;

    return locations.map((loc) => {
        const patch = patches.get(loc.slug);
        if (!patch) return loc;
        const externalLinks = patch.externalLinks || {};
        const hasLink = (field: keyof PayloadLocationDetailsExternalLinks): boolean =>
            Object.prototype.hasOwnProperty.call(externalLinks, field);
        const addressChanged = Boolean(patch.address && !addressesMatch(loc.address, patch.address));
        const applyHiddenMissionIds = Boolean(
            patch.hiddenMissionIds &&
            (patch.hiddenMissionIds.length > 0 || Array.isArray(loc.hiddenMissionIds)),
        );

        return {
            ...loc,
            ...(patch.address ? { address: { ...loc.address, ...patch.address } } : {}),
            ...(patch.hours ? { hours: { ...(loc.hours || {}), ...patch.hours } } : {}),
            ...(addressChanged && patch.mapUrl ? { mapUrl: patch.mapUrl } : {}),
            ...(hasLink('externalUrl') ? { externalUrl: externalLinks.externalUrl } : {}),
            ...(hasLink('bookingUrl') ? { bookingUrl: externalLinks.bookingUrl } : {}),
            ...(hasLink('rollerCheckoutUrl')
                ? { rollerCheckoutUrl: externalLinks.rollerCheckoutUrl }
                : hasLink('bookingUrl') && loc.bookingProvider === 'roller'
                  ? { rollerCheckoutUrl: externalLinks.bookingUrl }
                  : {}),
            ...(hasLink('giftCardUrl') ? { giftCardUrl: externalLinks.giftCardUrl } : {}),
            ...(hasLink('waiverUrl') ? { waiverUrl: externalLinks.waiverUrl } : {}),
            ...(externalLinks.groupFormUrls
                ? { groupFormUrls: { ...(loc.groupFormUrls || {}), ...externalLinks.groupFormUrls } }
                : {}),
            ...(applyHiddenMissionIds ? { hiddenMissionIds: patch.hiddenMissionIds } : {}),
            ...(patch.specialHours ? { specialHours: patch.specialHours } : {}),
        };
    });
}
