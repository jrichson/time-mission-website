import { comingSoonLocationPageTaglines, openLocationPageTaglines } from './page-taglines';
import locationPageAssets from '../data/site/location-page-assets.json';

export { comingSoonLocationPageTaglines };

interface LocationPageAssets {
    css: Record<string, string>;
    lang: Record<string, string>;
}

const locationAssets: LocationPageAssets = locationPageAssets;

export function locationPageCssHref(slug: string): string {
    const href = locationAssets.css[slug];
    if (!href) throw new Error(`${slug} missing from location page CSS registry`);
    return href;
}

export function locationPageLang(slug: string): string | undefined {
    return locationAssets.lang[slug];
}

export function locationPageTaglines(slug: string): string[] {
    return openLocationPageTaglines(slug);
}
