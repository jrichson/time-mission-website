import { allLocations, type LocationRecord } from '../data/locations';

export const GROUP_INQUIRY_LOCATION_SLUGS = [
    'manassas',
    'mount-prospect',
    'orland-park',
    'houston',
    'philadelphia',
] as const;

type GroupInquiryLocationSlug = (typeof GROUP_INQUIRY_LOCATION_SLUGS)[number];

export type JotformGroupFormConfig = {
    formId: string;
    executionTrackerBuildDate: string;
    buildDate: string;
    pipedriveLocationValue: string;
    dealTitlePrefix: string;
};

const JOTFORM_GROUP_FORM_CONFIGS: Record<GroupInquiryLocationSlug, JotformGroupFormConfig> = {
    manassas: {
        formId: '261936424348059',
        executionTrackerBuildDate: '1784236513760',
        buildDate: '1784236513760',
        pipedriveLocationValue: 'Manassas',
        dealTitlePrefix: 'MAN',
    },
    'mount-prospect': {
        formId: '261936424348059',
        executionTrackerBuildDate: '1784236513760',
        buildDate: '1784236513760',
        pipedriveLocationValue: 'Mt Prospect',
        dealTitlePrefix: 'MTP',
    },
    'orland-park': {
        formId: '261936424348059',
        executionTrackerBuildDate: '1784236513760',
        buildDate: '1784236513760',
        pipedriveLocationValue: 'Orland Park',
        dealTitlePrefix: 'OPK',
    },
    houston: {
        formId: '262186150244149',
        executionTrackerBuildDate: '1786402794617',
        buildDate: '1786402794618',
        pipedriveLocationValue: 'Houston',
        dealTitlePrefix: 'HOU',
    },
    philadelphia: {
        formId: '262217710699160',
        executionTrackerBuildDate: '1786402040663',
        buildDate: '1786402040663',
        pipedriveLocationValue: 'Philadelphia',
        dealTitlePrefix: 'PHL',
    },
};

export const GROUP_FORM_KEYS = [
    'default',
    'birthdays',
    'corporate',
    'field-trips',
    'bachelor-ette',
    'private-events',
    'holidays',
] as const;

export type GroupFormKey = (typeof GROUP_FORM_KEYS)[number];

const FORM_LABELS: Record<GroupFormKey, string> = {
    default: 'group event',
    birthdays: 'birthday party',
    corporate: 'corporate event',
    'field-trips': 'field trip',
    'bachelor-ette': 'bachelor or bachelorette event',
    'private-events': 'private event',
    holidays: 'holiday party',
};

export function isGroupInquiryLocationSlug(value: string): value is GroupInquiryLocationSlug {
    return GROUP_INQUIRY_LOCATION_SLUGS.includes(value as GroupInquiryLocationSlug);
}

export function isGroupFormKey(value: string): value is GroupFormKey {
    return GROUP_FORM_KEYS.includes(value as GroupFormKey);
}

export function formLabelFor(key: string): string {
    return isGroupFormKey(key) ? FORM_LABELS[key] : key.replace(/-/g, ' ');
}

export function groupInquiryPath(locationSlug: string, formKey: string): string {
    return `/groups/inquire/${locationSlug}/${formKey}`;
}

export function hasOnSiteGroupInquiryRoute(location: LocationRecord, formKey: string): boolean {
    const locationSlug = location.slug || location.id;
    return isGroupInquiryLocationSlug(locationSlug)
        && location.groupFormUrls?.[formKey] === groupInquiryPath(locationSlug, formKey);
}

export function jotformGroupFormConfigFor(locationSlug: string): JotformGroupFormConfig {
    if (!isGroupInquiryLocationSlug(locationSlug)) {
        throw new Error(`Unsupported Jotform group inquiry location: ${locationSlug}`);
    }
    return JOTFORM_GROUP_FORM_CONFIGS[locationSlug];
}

export type GroupInquiryPath = {
    location: LocationRecord;
    formKey: GroupFormKey;
    formLabel: string;
    canonicalPath: string;
};

export function groupInquiryPaths(): GroupInquiryPath[] {
    const paths: GroupInquiryPath[] = [];
    for (const location of allLocations) {
        const locationSlug = location.slug || location.id;
        if (!isGroupInquiryLocationSlug(locationSlug)) continue;
        for (const formKey of GROUP_FORM_KEYS) {
            if (!hasOnSiteGroupInquiryRoute(location, formKey)) continue;
            paths.push({
                location,
                formKey,
                formLabel: formLabelFor(formKey),
                canonicalPath: groupInquiryPath(locationSlug, formKey),
            });
        }
    }
    return paths;
}
