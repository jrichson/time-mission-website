import { allLocations, type LocationRecord } from '../data/locations';
import {
    GROUP_FORM_KEYS,
    formLabelFor,
    isGroupInquiryLocationSlug,
} from './group-form-context';

export type GroupFormThankYouPath = {
    location: LocationRecord;
    formKey: string;
    formLabel: string;
    canonicalPath: string;
};

export { formLabelFor } from './group-form-context';

export function isPipedriveUrl(value: unknown): boolean {
    return typeof value === 'string' && value.includes('webforms.pipedrive.com');
}

export function groupFormThankYouPaths(): GroupFormThankYouPath[] {
    const paths: GroupFormThankYouPath[] = [];
    for (const location of allLocations) {
        const formUrls = location.groupFormUrls || {};
        const locationSlug = location.slug || location.id;
        const formKeys = new Set(Object.keys(formUrls));
        if (isGroupInquiryLocationSlug(locationSlug)) {
            for (const formKey of GROUP_FORM_KEYS) formKeys.add(formKey);
        }
        for (const formKey of formKeys) {
            const url = formUrls[formKey];
            if (!isPipedriveUrl(url) && !isGroupInquiryLocationSlug(locationSlug)) continue;
            paths.push({
                location,
                formKey,
                formLabel: formLabelFor(formKey),
                canonicalPath: `/group-form-thank-you/${locationSlug}/${formKey}`,
            });
        }
    }
    return paths;
}
