import { allLocations, type LocationRecord } from '../data/locations';

export const JOTFORM_GROUP_FORM_ID = '261936424348059';

export const GROUP_INQUIRY_LOCATION_SLUGS = [
    'manassas',
    'mount-prospect',
    'orland-park',
] as const;

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

const PIPEDRIVE_LOCATION_VALUES: Record<(typeof GROUP_INQUIRY_LOCATION_SLUGS)[number], string> = {
    manassas: 'Manassas',
    'mount-prospect': 'Mt Prospect',
    'orland-park': 'Orland Park',
};

export function isGroupInquiryLocationSlug(value: string): value is (typeof GROUP_INQUIRY_LOCATION_SLUGS)[number] {
    return GROUP_INQUIRY_LOCATION_SLUGS.includes(value as (typeof GROUP_INQUIRY_LOCATION_SLUGS)[number]);
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

export function pipedriveLocationValueFor(locationSlug: string, fallbackName: string): string {
    return isGroupInquiryLocationSlug(locationSlug)
        ? PIPEDRIVE_LOCATION_VALUES[locationSlug]
        : fallbackName;
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
