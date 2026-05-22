import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allLocations, type LocationRecord } from '../src/data/locations';
import { locationViewModel, type LocationViewModel } from '../src/lib/location-view';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

interface RuntimeLocationViews {
    getLocationView(loc: LocationRecord, id?: string): LocationViewModel;
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
});
