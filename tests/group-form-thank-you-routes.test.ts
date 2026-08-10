import { describe, expect, it } from 'vitest';

import { allLocations } from '../src/data/locations';
import { groupFormThankYouPathsFor } from '../src/lib/group-form-thank-you-routes';

describe('group form thank-you route generation', () => {
    it('preserves CMS-defined Pipedrive form keys outside the standard Jotform set', () => {
        const mountProspect = allLocations.find((location) => location.slug === 'mount-prospect');
        expect(mountProspect).toBeDefined();

        const paths = groupFormThankYouPathsFor([{
            ...mountProspect!,
            groupFormUrls: {
                'school-events': 'https://webforms.pipedrive.com/f/custom-school-events',
            },
        }]);

        expect(paths).toEqual([expect.objectContaining({
            formKey: 'school-events',
            formLabel: 'school events',
            canonicalPath: '/group-form-thank-you/mount-prospect/school-events',
        })]);
    });

    it('does not emit Jotform routes after the active profile removes its group forms', () => {
        const houston = allLocations.find((location) => location.slug === 'houston');
        expect(houston).toBeDefined();

        expect(groupFormThankYouPathsFor([{
            ...houston!,
            groupFormUrls: undefined,
        }])).toEqual([]);
    });
});
