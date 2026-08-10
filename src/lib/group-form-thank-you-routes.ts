import { allLocations, type LocationRecord } from '../data/locations';
import {
    formLabelFor,
    hasOnSiteGroupInquiryRoute,
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

export function groupFormThankYouPathsFor(locations: LocationRecord[]): GroupFormThankYouPath[] {
    const paths: GroupFormThankYouPath[] = [];
    for (const location of locations) {
        const formUrls = location.groupFormUrls || {};
        const locationSlug = location.slug || location.id;
        for (const formKey of Object.keys(formUrls)) {
            const url = formUrls[formKey];
            if (!isPipedriveUrl(url) && !hasOnSiteGroupInquiryRoute(location, formKey)) continue;
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

export function groupFormThankYouPaths(): GroupFormThankYouPath[] {
    return groupFormThankYouPathsFor(allLocations);
}
