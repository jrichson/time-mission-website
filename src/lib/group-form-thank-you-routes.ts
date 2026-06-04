import { allLocations, type LocationRecord } from '../data/locations';

export type GroupFormThankYouPath = {
    location: LocationRecord;
    formKey: string;
    formLabel: string;
    canonicalPath: string;
};

const FORM_LABELS: Record<string, string> = {
    default: 'group event',
    birthdays: 'birthday party',
    corporate: 'corporate event',
    'field-trips': 'field trip',
    'bachelor-ette': 'bachelor or bachelorette event',
    'private-events': 'private event',
    holidays: 'holiday party',
};

export function formLabelFor(key: string): string {
    return FORM_LABELS[key] || key.replace(/-/g, ' ');
}

export function isPipedriveUrl(value: unknown): boolean {
    return typeof value === 'string' && value.includes('webforms.pipedrive.com');
}

export function groupFormThankYouPaths(): GroupFormThankYouPath[] {
    const paths: GroupFormThankYouPath[] = [];
    for (const location of allLocations) {
        const formUrls = location.groupFormUrls || {};
        for (const [formKey, url] of Object.entries(formUrls)) {
            if (!isPipedriveUrl(url)) continue;
            paths.push({
                location,
                formKey,
                formLabel: formLabelFor(formKey),
                canonicalPath: `/group-form-thank-you/${location.slug || location.id}/${formKey}`,
            });
        }
    }
    return paths;
}
