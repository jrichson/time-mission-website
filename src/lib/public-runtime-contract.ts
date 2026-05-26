export type RuntimeScriptId =
    | 'progressive'
    | 'language'
    | 'consent'
    | 'analytics'
    | 'bookingJourney'
    | 'bookingFrame'
    | 'bookingBriqProvider'
    | 'locationCatalogView'
    | 'locations'
    | 'nav'
    | 'bookingController'
    | 'ticketPanel'
    | 'a11y';

export interface RuntimeScript {
    id: RuntimeScriptId;
    src: string;
    version: number | null;
}

export type LazyRuntimeTrigger =
    | 'consent-ui'
    | 'contact-form'
    | 'turnstile-form'
    | 'web-vitals';

export interface LazyRuntimeScript {
    id: string;
    trigger: LazyRuntimeTrigger;
    src: string;
    version: number | null;
    dependsOn?: string[];
}

export const publicRuntimeScripts: RuntimeScript[] = [
    { id: 'progressive', src: '/js/site-progressive.js', version: 1 },
    { id: 'language', src: '/js/language-switcher.js', version: 4 },
    { id: 'consent', src: '/js/consent-bridge.js', version: 1 },
    { id: 'analytics', src: '/js/analytics.js', version: 1 },
    { id: 'bookingJourney', src: '/js/booking-journey.js', version: 10 },
    { id: 'bookingFrame', src: '/js/booking-frame.js', version: 1 },
    { id: 'bookingBriqProvider', src: '/js/booking-provider-briq.js', version: 1 },
    { id: 'locationCatalogView', src: '/js/location-catalog-view.js', version: 8 },
    { id: 'locations', src: '/js/locations.js', version: 24 },
    { id: 'nav', src: '/js/nav.js', version: 15 },
    { id: 'bookingController', src: '/js/booking-controller.js', version: 20 },
    { id: 'ticketPanel', src: '/js/ticket-panel.js', version: 12 },
    { id: 'a11y', src: '/js/a11y.js', version: null },
];

export const lazyRuntimeScripts: LazyRuntimeScript[] = [
    { id: 'cookieconsent', trigger: 'consent-ui', src: '/js/cookieconsent.umd.js', version: null },
    { id: 'cookieConsent', trigger: 'consent-ui', src: '/js/cookie-consent.js', version: 1, dependsOn: ['cookieconsent'] },
    { id: 'contactFormAnalytics', trigger: 'contact-form', src: '/js/contact-form-analytics.js', version: 1 },
    { id: 'formProtection', trigger: 'turnstile-form', src: '/js/form-protection.js', version: 1 },
    { id: 'webVitalsLibrary', trigger: 'web-vitals', src: '/js/web-vitals.iife.js', version: null },
    { id: 'webVitalsRum', trigger: 'web-vitals', src: '/js/web-vitals-rum.js', version: 1, dependsOn: ['webVitalsLibrary'] },
];

export function versionedRuntimeSrc(script: Pick<RuntimeScript, 'src' | 'version'>): string {
    return script.version === null ? script.src : `${script.src}?v=${script.version}`;
}
