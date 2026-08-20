import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
    LIVE_SITE_LOCATION_SNAPSHOT,
    LIVE_SITE_PAGE_SNAPSHOT,
    LIVE_SITE_SYNC_SOURCE,
} from '../cms/migration-data/20260730_live_site_snapshot';
import { EU_LOCATION_OPERATIONAL_SNAPSHOT } from '../cms/migration-data/20260731_eu_location_operational_snapshot';
import { PHILADELPHIA_NOW_OPEN_SNAPSHOT } from '../cms/migration-data/20260807_philadelphia_now_open_snapshot';
import { HOUSTON_PHILADELPHIA_JOTFORM_ROUTES_SNAPSHOT } from '../cms/migration-data/20260810_houston_philadelphia_jotform_routes_snapshot';
import { HOUSTON_BACK_TO_SCHOOL_PAGE_SNAPSHOT } from '../cms/migration-data/20260811_houston_back_to_school_pages_snapshot';
import { PRESS_SEO_SNAPSHOT } from '../cms/migration-data/20260819_press_seo_snapshot';
import { EINDHOVEN_ADDRESS_CORRECTION_SNAPSHOT } from '../cms/migration-data/20260817_eindhoven_address_correction_snapshot';
import { PHILADELPHIA_EDUCATORS_PAGE_SNAPSHOT } from '../cms/migration-data/20260820_philadelphia_educators_page_snapshot';
import { TM_OPS_EDUCATORS_PAGE_SNAPSHOT } from '../cms/migration-data/20260820_tm_ops_educators_pages_snapshot';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relativePath: string): unknown {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

describe('live-site-to-CMS sync snapshot', () => {
    it('captures every CMS-backed location value from the authoritative public source', () => {
        const locationDocument = readJson('data/locations.json') as {
            locations: Array<Record<string, any>>;
        };
        const expected = locationDocument.locations.map((location) => ({
            slug: location.slug,
            title: location.name,
            ticker: location.ticker,
            address: {
                line1: location.address?.line1 ?? null,
                line2: location.address?.line2 ?? null,
                city: location.address?.city ?? '',
                state: location.address?.state ?? null,
                zip: location.address?.zip ?? null,
                country: location.address?.country ?? '',
            },
            hours: location.hours ?? {},
            externalLinks: {
                externalUrl: location.externalUrl ?? null,
                bookingUrl: location.bookingUrl ?? null,
                rollerCheckoutUrl: location.rollerCheckoutUrl ?? null,
                giftCardUrl: location.giftCardUrl ?? null,
                waiverUrl: location.waiverUrl ?? null,
            },
            groupFormUrls: location.groupFormUrls ?? {},
            hiddenMissionIds: location.hiddenMissionIds ?? [],
        }));

        const operationalPatches = new Map(
            EU_LOCATION_OPERATIONAL_SNAPSHOT.map((location) => [location.slug, location]),
        );
        const groupFormPatches = new Map(
            HOUSTON_PHILADELPHIA_JOTFORM_ROUTES_SNAPSHOT.map((location) => [location.slug, {
                groupFormUrls: Object.fromEntries(
                    Object.keys(location.groupFormUrls).map((formKey) => [
                        formKey,
                        location.previousGroupFormUrl,
                    ]),
                ),
            }]),
        );
        const effectiveSnapshot = LIVE_SITE_LOCATION_SNAPSHOT.map((location) => {
            const patch = operationalPatches.get(location.slug);
            const operationalLocation = patch ? {
                ...location,
                hours: patch.hours,
                externalLinks: {
                    ...location.externalLinks,
                    ...('externalLinks' in patch ? patch.externalLinks : {}),
                },
            } : location;
            const currentLocation = location.slug === PHILADELPHIA_NOW_OPEN_SNAPSHOT.location.slug
                ? { ...operationalLocation, ticker: PHILADELPHIA_NOW_OPEN_SNAPSHOT.location.ticker }
                : operationalLocation;
            const addressCorrectedLocation = location.slug === EINDHOVEN_ADDRESS_CORRECTION_SNAPSHOT.location.slug
                ? {
                    ...currentLocation,
                    address: {
                        ...currentLocation.address,
                        zip: EINDHOVEN_ADDRESS_CORRECTION_SNAPSHOT.location.zip,
                    },
                }
                : currentLocation;
            const groupFormPatch = groupFormPatches.get(location.slug);
            return groupFormPatch
                ? { ...addressCorrectedLocation, groupFormUrls: groupFormPatch.groupFormUrls }
                : addressCorrectedLocation;
        });

        expect(LIVE_SITE_SYNC_SOURCE.commit).toBe('6cbae6adde40555535a271155b6c59d4f80db56c');
        expect(effectiveSnapshot).toEqual(expected);
    });

    it('captures every code-owned SEO route for the CMS site-page collection', () => {
        const routes = readJson('src/data/site/seo-routes.json') as Record<
            string,
            {
                description: string;
                ogImage: string;
                title: string;
                twitterImage?: string;
            }
        >;
        const expected = Object.entries(routes).map(([routePath, seo]) => ({
            path: routePath,
            title: seo.title,
            metaTitle: seo.title,
            metaDescription: seo.description,
            robots:
                routePath === '/404' || routePath === '/contact-thank-you'
                    ? 'noindex,follow'
                    : 'index,follow',
            ogImage: seo.ogImage,
            twitterImage: seo.twitterImage ?? seo.ogImage,
        }));

        const pageSnapshotByPath = new Map(
            [
                ...LIVE_SITE_PAGE_SNAPSHOT,
                ...HOUSTON_BACK_TO_SCHOOL_PAGE_SNAPSHOT,
                PHILADELPHIA_EDUCATORS_PAGE_SNAPSHOT,
                ...TM_OPS_EDUCATORS_PAGE_SNAPSHOT,
            ]
                .map((page) => [page.path, page]),
        );
        const pressSeoByPath = new Map(PRESS_SEO_SNAPSHOT.map((page) => [page.path, page]));
        const effectiveSnapshot = expected.map(({ path: routePath }) => {
            const page = pageSnapshotByPath.get(routePath);
            const pressSeo = pressSeoByPath.get(routePath);
            if (page && pressSeo) {
                return {
                    ...page,
                    title: pressSeo.title,
                    metaTitle: pressSeo.metaTitle,
                    metaDescription: pressSeo.metaDescription,
                };
            }
            if (page?.path === EINDHOVEN_ADDRESS_CORRECTION_SNAPSHOT.page.path) {
                return {
                    ...page,
                    metaDescription: EINDHOVEN_ADDRESS_CORRECTION_SNAPSHOT.page.metaDescription,
                };
            }
            return page?.path === PHILADELPHIA_NOW_OPEN_SNAPSHOT.page.path
                ? { ...page, metaDescription: PHILADELPHIA_NOW_OPEN_SNAPSHOT.page.metaDescription }
                : page;
        });

        expect(effectiveSnapshot).toEqual(expected);
    });

    it('registers the one-way content sync migration', () => {
        const migrationIndex = fs.readFileSync(path.join(root, 'cms/migrations/index.ts'), 'utf8');
        const migration = fs.readFileSync(
            path.join(root, 'cms/migrations/20260730_151000_sync_live_site_to_cms.ts'),
            'utf8',
        );
        const temporaryRollerMigration = fs.readFileSync(
            path.join(root, 'cms/migrations/20260810_170000_houston_philadelphia_roller_routes.ts'),
            'utf8',
        );
        const backToSchoolMigration = fs.readFileSync(
            path.join(root, 'cms/migrations/20260811_210000_houston_back_to_school_pages.ts'),
            'utf8',
        );
        const philadelphiaEducatorsMigration = fs.readFileSync(
            path.join(root, 'cms/migrations/20260820_090000_philadelphia_educators_page.ts'),
            'utf8',
        );
        const tmOpsEducatorsMigration = fs.readFileSync(
            path.join(root, 'cms/migrations/20260820_100000_tm_ops_educators_pages.ts'),
            'utf8',
        );
        const pressSeoMigration = fs.readFileSync(
            path.join(root, 'cms/migrations/20260819_100000_press_seo.ts'),
            'utf8',
        );
        const pressReleaseScopeMigration = fs.readFileSync(
            path.join(root, 'cms/migrations/20260819_110000_press_release_scope.ts'),
            'utf8',
        );

        expect(migrationIndex).toContain('20260730_151000_sync_live_site_to_cms');
        expect(migrationIndex).toContain('20260819_100000_press_seo');
        expect(pressSeoMigration).toContain('PRESS_SEO_SNAPSHOT');
        expect(migrationIndex).toContain('20260819_110000_press_release_scope');
        expect(pressReleaseScopeMigration).toContain('"location_slug" = NULL');
        expect(migrationIndex).toContain('20260731_180000_eu_location_operational_data');
        expect(migrationIndex).toContain('20260810_090000_houston_philadelphia_jotform_routes');
        expect(migrationIndex).toContain('20260810_170000_houston_philadelphia_roller_routes');
        expect(migrationIndex).toContain('20260811_210000_houston_back_to_school_pages');
        expect(temporaryRollerMigration).toContain('location.previousGroupFormUrl');
        expect(temporaryRollerMigration).toContain('await writeGroupFormUrls(db, false)');
        expect(backToSchoolMigration).toContain('HOUSTON_BACK_TO_SCHOOL_PAGE_SNAPSHOT');
        expect(backToSchoolMigration).toContain('ON CONFLICT ("path") DO NOTHING');
        expect(migrationIndex).toContain('20260820_090000_philadelphia_educators_page');
        expect(philadelphiaEducatorsMigration).toContain('PHILADELPHIA_EDUCATORS_PAGE_SNAPSHOT');
        expect(philadelphiaEducatorsMigration).toContain('ON CONFLICT ("path") DO NOTHING');
        expect(migrationIndex).toContain('20260820_100000_tm_ops_educators_pages');
        expect(tmOpsEducatorsMigration).toContain('TM_OPS_EDUCATORS_PAGE_SNAPSHOT');
        expect(tmOpsEducatorsMigration).toContain('ON CONFLICT ("path") DO NOTHING');
        expect(migration).toContain('LIVE_SITE_LOCATION_SNAPSHOT');
        expect(migration).toContain('LIVE_SITE_PAGE_SNAPSHOT');
        expect(migration).toContain('"announcement_banners"');
    });
});
