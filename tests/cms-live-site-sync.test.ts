import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
    LIVE_SITE_LOCATION_SNAPSHOT,
    LIVE_SITE_PAGE_SNAPSHOT,
    LIVE_SITE_SYNC_SOURCE,
} from '../cms/migration-data/20260730_live_site_snapshot';

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

        expect(LIVE_SITE_SYNC_SOURCE.commit).toBe('6cbae6adde40555535a271155b6c59d4f80db56c');
        expect(LIVE_SITE_LOCATION_SNAPSHOT).toEqual(expected);
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

        expect(LIVE_SITE_PAGE_SNAPSHOT).toEqual(expected);
    });

    it('registers the one-way content sync migration', () => {
        const migrationIndex = fs.readFileSync(path.join(root, 'cms/migrations/index.ts'), 'utf8');
        const migration = fs.readFileSync(
            path.join(root, 'cms/migrations/20260730_151000_sync_live_site_to_cms.ts'),
            'utf8',
        );

        expect(migrationIndex).toContain('20260730_151000_sync_live_site_to_cms');
        expect(migration).toContain('LIVE_SITE_LOCATION_SNAPSHOT');
        expect(migration).toContain('LIVE_SITE_PAGE_SNAPSHOT');
        expect(migration).toContain('"announcement_banners"');
    });
});
