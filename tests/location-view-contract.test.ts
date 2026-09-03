import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allLocations, type LocationRecord } from '../src/data/locations';
import {
    locationCtaView,
    locationHeadlineStatus,
    locationHoursRows,
    locationPhoneHref,
    locationSignupFormId,
    locationStateBadge,
    locationViewModel,
    type LocationViewModel,
} from '../src/lib/location-view';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

interface RuntimeLocationViews {
    getLocationView(loc: LocationRecord, id?: string): LocationViewModel;
    hoursTextForLocation(loc: LocationRecord, now?: Date): string;
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

    it('uses each European location country code for its compact badge', () => {
        const antwerp = allLocations.find((loc) => loc.id === 'antwerp');
        const eindhoven = allLocations.find((loc) => loc.id === 'eindhoven');
        if (!antwerp || !eindhoven) throw new Error('European locations missing');

        expect(locationStateBadge(antwerp)).toBe('BE');
        expect(locationStateBadge(eindhoven)).toBe('NL');
    });

    it('keeps Eindhoven phone display formatting while dialing its E.164 number', () => {
        const eindhoven = allLocations.find((loc) => loc.id === 'eindhoven');
        if (!eindhoven) throw new Error('Eindhoven location missing');

        expect(eindhoven.contact.phone).toBe('+31 (0)40 808 3636');
        expect(eindhoven.phoneE164).toBe('+31408083636');
        expect(locationPhoneHref(eindhoven)).toBe('tel:+31408083636');
    });

    it('routes Eindhoven conversion CTAs to its Klaviyo signup form', () => {
        const eindhoven = allLocations.find((loc) => loc.id === 'eindhoven');
        if (!eindhoven) throw new Error('Eindhoven location missing');
        const internalEindhoven = { ...eindhoven, externalUrl: undefined };

        expect(locationSignupFormId(eindhoven)).toBe('Y5LLf7');
        expect(locationCtaView(internalEindhoven)).toEqual({
            href: '#',
            isBookingTrigger: false,
            label: 'Sign Up',
            i18n: 'location.signUp',
            signupFormId: 'Y5LLf7',
        });
        expect(locationViewModel(internalEindhoven)).toMatchObject({
            bookLabel: 'Sign Up',
            signupFormId: 'Y5LLf7',
        });
    });

    it('keeps Brussels phone display formatting while dialing its E.164 number', () => {
        const brussels = allLocations.find((loc) => loc.id === 'brussels');
        if (!brussels) throw new Error('Brussels location missing');

        expect(brussels.contact.phone).toBe('+32 (0) 479 66 09 32');
        expect(brussels.contact.email).toBe('brussels@timemission.com');
        expect(brussels.phoneE164).toBe('+32479660932');
        expect(locationPhoneHref(brussels)).toBe('tel:+32479660932');
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
                signupFormId: runtimeView.signupFormId,
                status: runtimeView.status,
            }).toEqual(typedView);
        }
    });

    it('treats Philadelphia as open everywhere while preserving its published hours', () => {
        const philadelphia = allLocations.find((loc) => loc.id === 'philadelphia');
        if (!philadelphia) throw new Error('Philadelphia location missing');

        const runtime = loadRuntimeLocationViews();

        expect(philadelphia.status).toBe('open');
        expect(philadelphia.openingLabel).toBeUndefined();
        expect(locationHeadlineStatus(philadelphia)).toBe('Now Open');
        expect(philadelphia.hours.mon).toMatchObject({
            open: '12:00',
            close: '22:00',
            label: '12pm - 10pm',
        });
        const beforeLaborDay = new Date('2026-08-21T12:00:00Z');
        const lateLaborDayInPhiladelphia = new Date('2026-09-08T03:30:00Z');
        const startOfSeptember8InPhiladelphia = new Date('2026-09-08T04:00:00Z');
        const afterLaborDay = new Date('2026-09-08T12:00:00Z');
        expect(locationHoursRows(philadelphia, beforeLaborDay)).toContainEqual({
            day: 'Labor Day',
            label: '10am - 10pm',
        });
        expect(locationHoursRows(philadelphia, beforeLaborDay)).toHaveLength(8);
        expect(locationHoursRows(philadelphia, lateLaborDayInPhiladelphia)).toHaveLength(8);
        expect(locationHoursRows(philadelphia, startOfSeptember8InPhiladelphia)).toHaveLength(7);
        expect(locationHoursRows(philadelphia, afterLaborDay)).toHaveLength(7);
        expect(runtime.hoursTextForLocation(philadelphia, beforeLaborDay)).toContain('Labor Day: 10am - 10pm');
        expect(runtime.hoursTextForLocation(philadelphia, lateLaborDayInPhiladelphia)).toContain('Labor Day: 10am - 10pm');
        expect(runtime.hoursTextForLocation(philadelphia, afterLaborDay)).not.toContain('Labor Day');
        expect(runtime.hoursTextForLocation(philadelphia, beforeLaborDay)).toContain('Mon: 12pm - 10pm');
    });
});
