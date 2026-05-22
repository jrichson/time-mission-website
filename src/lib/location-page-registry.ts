import { comingSoonLocationPageTaglines, openLocationPageTaglines } from './page-taglines';

export { comingSoonLocationPageTaglines };

const comingSoonLocationCss = '/css/page-houston.css?v=2';

const locationPageCssBySlug: Record<string, string> = {
    antwerp: '/css/page-antwerp.css?v=2',
    brussels: comingSoonLocationCss,
    dallas: comingSoonLocationCss,
    houston: comingSoonLocationCss,
    lincoln: '/css/page-lincoln.css?v=2',
    manassas: '/css/page-manassas.css?v=2',
    'mount-prospect': '/css/page-mount-prospect.css?v=2',
    nashville: comingSoonLocationCss,
    'orland-park': comingSoonLocationCss,
    philadelphia: '/css/page-philadelphia.css?v=2',
    'west-nyack': '/css/page-west-nyack.css?v=2',
};

const locationPageLangBySlug: Record<string, string> = {
    antwerp: 'nl-BE',
    brussels: 'fr-BE',
};

export function locationPageCssHref(slug: string): string {
    const href = locationPageCssBySlug[slug];
    if (!href) throw new Error(`${slug} missing from location page CSS registry`);
    return href;
}

export function locationPageLang(slug: string): string | undefined {
    return locationPageLangBySlug[slug];
}

export function locationPageTaglines(slug: string): string[] {
    return openLocationPageTaglines(slug);
}
