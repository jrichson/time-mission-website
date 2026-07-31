import {
    isInternalLocation,
    localizedPath,
    publicLocationForProfile,
    publicLocationsForProfile,
    resolveSiteProfile,
} from '../../config/site-profiles.mjs';

export interface SiteProfile {
    id: 'us' | 'eu';
    origin: string;
    counterpartOrigin: string;
    internalRegion: 'us' | 'europe';
    locales: readonly string[];
    defaultLocale: string;
    consentProfile: 'us_open' | 'eu_strict';
    localizedRoutes: boolean;
    pagesProject: string;
    d1DatabaseName: string;
    turnstileSiteKeyEnv: string;
    gtmContainerIdEnv: string;
}

export const activeSiteProfile = resolveSiteProfile() as SiteProfile;

export {
    isInternalLocation,
    localizedPath,
    publicLocationForProfile,
    publicLocationsForProfile,
    resolveSiteProfile,
};
