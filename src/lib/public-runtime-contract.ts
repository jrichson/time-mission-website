export interface RuntimeScript {
    src: string;
    version: number | null;
}

export const publicRuntimeScripts: RuntimeScript[] = [
    { src: '/js/site-progressive.js', version: 1 },
    { src: '/js/language-switcher.js', version: 2 },
    { src: '/js/consent-bridge.js', version: 1 },
    { src: '/js/analytics.js', version: 1 },
    { src: '/js/booking-journey.js', version: 1 },
    { src: '/js/location-catalog-view.js', version: 1 },
    { src: '/js/locations.js', version: 15 },
    { src: '/js/nav.js', version: 9 },
    { src: '/js/booking-controller.js', version: 7 },
    { src: '/js/ticket-panel.js', version: 7 },
    { src: '/js/a11y.js', version: null },
];

export function versionedRuntimeSrc(script: RuntimeScript): string {
    return script.version === null ? script.src : `${script.src}?v=${script.version}`;
}
