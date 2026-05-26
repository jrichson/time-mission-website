export type AnnouncementBannerTargetScope = 'global' | 'regions' | 'locations';

export interface PayloadAnnouncementBannerRegionTarget {
    region?: string | null;
}

export interface PayloadAnnouncementBannerLocationTarget {
    locationSlug?: string | null;
}

export interface PayloadAnnouncementBannerDoc {
    id: string | number;
    title?: string | null;
    message?: string | null;
    published?: boolean | null;
    startsAt?: string | null;
    endsAt?: string | null;
    priority?: number | null;
    targetScope?: AnnouncementBannerTargetScope | string | null;
    targetRegions?: PayloadAnnouncementBannerRegionTarget[] | null;
    targetLocations?: PayloadAnnouncementBannerLocationTarget[] | null;
    linkLabel?: string | null;
    linkUrl?: string | null;
}

export interface AnnouncementBannerSelectionContext {
    locationSlug?: string | null;
    now?: Date;
    region?: string | null;
}

export interface AnnouncementBannerView {
    message: string;
    linkLabel?: string | null;
    linkUrl?: string | null;
}

const INTERNAL_PATH_REGEX = /^\/$|^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
const ANNOUNCEMENT_LINK_MAX_LENGTH = 2048;

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function timeValue(value: string | null | undefined): number | null {
    const raw = cleanString(value);
    if (!raw) return null;
    const time = new Date(raw).getTime();
    return Number.isFinite(time) ? time : null;
}

function safeAnnouncementLink(value: string | null | undefined): string | null {
    const raw = cleanString(value);
    if (!raw || raw.length > ANNOUNCEMENT_LINK_MAX_LENGTH || /[<>"'\\\s]/.test(raw)) return null;
    if (INTERNAL_PATH_REGEX.test(raw)) return raw;

    try {
        const url = new URL(raw);
        if (url.protocol !== 'https:' || url.username || url.password) return null;
        return url.toString();
    } catch {
        return null;
    }
}

export function announcementBannerDocLooksUsable(doc: PayloadAnnouncementBannerDoc): boolean {
    if (!doc || doc.published !== true) return false;
    return Boolean(cleanString(doc.message));
}

function announcementBannerIsActive(doc: PayloadAnnouncementBannerDoc, now: Date): boolean {
    const nowTime = now.getTime();
    const startsAt = timeValue(doc.startsAt);
    const endsAt = timeValue(doc.endsAt);

    if (startsAt != null && startsAt > nowTime) return false;
    if (endsAt != null && endsAt <= nowTime) return false;
    return true;
}

function normalizedTargetValues<T extends { region?: string | null; locationSlug?: string | null }>(
    rows: T[] | null | undefined,
    key: keyof T,
): string[] {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => cleanString(row?.[key])).filter(Boolean);
}

function announcementBannerMatchesTarget(doc: PayloadAnnouncementBannerDoc, context: AnnouncementBannerSelectionContext): boolean {
    const scope = doc.targetScope || 'global';
    if (scope === 'global') return true;

    if (scope === 'regions') {
        const region = cleanString(context.region);
        const targetRegions = normalizedTargetValues(doc.targetRegions, 'region');
        return Boolean(region && targetRegions.includes(region));
    }

    if (scope === 'locations') {
        const locationSlug = cleanString(context.locationSlug);
        const targetLocations = normalizedTargetValues(doc.targetLocations, 'locationSlug');
        return Boolean(locationSlug && targetLocations.includes(locationSlug));
    }

    return false;
}

function startsAtSortValue(doc: PayloadAnnouncementBannerDoc): number {
    return timeValue(doc.startsAt) ?? 0;
}

export function selectAnnouncementBanner(
    docs: PayloadAnnouncementBannerDoc[],
    context: AnnouncementBannerSelectionContext = {},
): PayloadAnnouncementBannerDoc | null {
    const now = context.now ?? new Date();
    const eligible = docs.filter(
        (doc) =>
            announcementBannerDocLooksUsable(doc) &&
            announcementBannerIsActive(doc, now) &&
            announcementBannerMatchesTarget(doc, context),
    );

    eligible.sort((a, b) => {
        const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
        if (priorityDelta !== 0) return priorityDelta;
        return startsAtSortValue(b) - startsAtSortValue(a);
    });

    return eligible[0] ?? null;
}

export function announcementBannerViewForDoc(doc: PayloadAnnouncementBannerDoc | null | undefined): AnnouncementBannerView | null {
    if (!doc || !announcementBannerDocLooksUsable(doc)) return null;

    const linkUrl = safeAnnouncementLink(doc.linkUrl);
    return {
        message: cleanString(doc.message),
        linkLabel: linkUrl ? cleanString(doc.linkLabel) || 'Learn more' : null,
        linkUrl,
    };
}
