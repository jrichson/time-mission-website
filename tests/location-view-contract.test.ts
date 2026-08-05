import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allLocations, type LocationRecord } from '../src/data/locations';
import {
    locationCtaView,
    locationHoursRows,
    locationViewModel,
    type LocationViewModel,
} from '../src/lib/location-view';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

interface RuntimeLocationViews {
    getLocationView(loc: LocationRecord, id?: string): LocationViewModel;
    hoursTextForLocation(loc: LocationRecord): string;
}

interface RuntimeWindow {
    location: {
        origin: string;
        search: string;
    };
    window?: RuntimeWindow;
    TMLocationViews?: RuntimeLocationViews;
}

function loadRuntimeLocationViews() {
    const window: RuntimeWindow = {
        location: {
            origin: 'https://www.timemission.com',
            search: '',
        },
    };
    window.window = window;

    const context = vm.createContext({
        URL,
        URLSearchParams,
        window,
    });

    vm.runInContext(fs.readFileSync(path.join(root, 'js/booking-journey.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/location-catalog-view.js'), 'utf8'), context);
    if (!window.TMLocationViews) throw new Error('TMLocationViews did not initialize');
    return window.TMLocationViews;
}

describe('Location View contract', () => {
    it('keeps Lincoln team sizes capped at four players', () => {
        const lincoln = allLocations.find((loc) => loc.id === 'lincoln');
        if (!lincoln) throw new Error('Lincoln location missing');

        expect(lincoln.teamSize).toEqual({ min: 2, max: 4 });
        expect(lincoln.faqs).toContainEqual(expect.objectContaining({
            a: expect.stringContaining('Teams are 2 to 4 players.'),
        }));
    });

    it('publishes the Nashville direct contact email', () => {
        const nashville = allLocations.find((loc) => loc.id === 'nashville');
        if (!nashville) throw new Error('Nashville location missing');

        expect(nashville.contact.email).toBe('nashville@timemission.com');
    });

    it('gives Edison a local page while keeping its Supercharged NJ action', () => {
        const edison = allLocations.find((loc) => loc.id === 'edison');
        if (!edison) throw new Error('Edison location missing');

        const view = locationViewModel(edison);

        expect(edison.status).toBe('coming-soon');
        expect(view.externalUrl).toBe('https://www.superchargednj.com/');
        expect(view.pageUrl).toBe('/edison');
        expect(view.bookLabel).toBe('Visit Location Site');
        expect(locationCtaView(edison)).toEqual({
            href: 'https://www.superchargednj.com/',
            isBookingTrigger: false,
            label: 'Visit Location Site',
            i18n: 'location.visitLocationSite',
        });
    });

    it('routes only the requested launch locations to First Access', () => {
        const firstAccessUrls: Record<string, string> = {
            dallas: 'https://time-mission.myklpages.com/l/XDp7DH',
            boston: 'https://time-mission.myklpages.com/l/WcMfDv',
            nashville: 'https://time-mission.myklpages.com/l/TJHPn3',
        };

        for (const [slug, href] of Object.entries(firstAccessUrls)) {
            const location = allLocations.find((loc) => loc.slug === slug);
            if (!location) throw new Error(`${slug} location missing`);

            expect(location.firstAccessUrl).toBe(href);
            expect(locationViewModel(location).bookLabel).toBe('First Access');
            expect(locationCtaView(location)).toEqual({
                href,
                isBookingTrigger: false,
                label: 'First Access',
                i18n: 'location.firstAccess',
            });
        }

        const eindhoven = allLocations.find((loc) => loc.slug === 'eindhoven');
        if (!eindhoven) throw new Error('Eindhoven location missing');
        expect(eindhoven.firstAccessUrl).toBeUndefined();
        expect(locationCtaView(eindhoven)).toMatchObject({
            href: '/contact#location=eindhoven&type=updates',
            label: 'Contact Us',
        });
    });

    it('keeps runtime location views aligned with the typed build-time view model', () => {
        const runtime = loadRuntimeLocationViews();

        for (const loc of allLocations) {
            const typedView = locationViewModel(loc);
            const runtimeView = runtime.getLocationView(loc, loc.id);

            expect({
                addressText: runtimeView.addressText,
                bookLabel: runtimeView.bookLabel,
                bookable: runtimeView.bookable,
                externalUrl: runtimeView.externalUrl,
                id: runtimeView.id,
                openingLabel: runtimeView.openingLabel,
                pageUrl: runtimeView.pageUrl,
                slug: runtimeView.slug,
                status: runtimeView.status,
            }).toEqual(typedView);
        }
    });

    it('shows Philadelphia reopening hours and opening label while advance booking is live', () => {
        const philadelphia = allLocations.find((loc) => loc.id === 'philadelphia');
        if (!philadelphia) throw new Error('Philadelphia location missing');

        const runtime = loadRuntimeLocationViews();

        expect(philadelphia.status).toBe('coming-soon');
        expect(philadelphia.openingLabel).toBe('Opening 8/7');
        expect(philadelphia.hours.mon).toMatchObject({
            open: '10:00',
            close: '22:00',
            label: '10am - 10pm',
        });
        expect(locationHoursRows(philadelphia)).toHaveLength(7);
        expect(runtime.hoursTextForLocation(philadelphia)).toContain('Mon: 10am - 10pm');
    });
});
