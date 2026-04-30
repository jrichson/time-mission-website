import defaults from '../../data/site/seo-defaults.json';
import routes from '../../data/site/seo-routes.json';
import robots from '../../data/site/seo-robots.json';
import { resolveRobotsForRoute } from './route-patterns';

export interface EntryShape {
    title: string;
    description: string;
    ogImage: string;
    twitterImage: string;
}

export interface ResolvedSeo {
    title: string;
    description: string;
    canonicalPath: string;
    canonicalUrl: string;
    ogImage: string;
    twitterImage: string;
    robots: string;
    siteName: string;
}

const baseUrl = 'https://timemission.com';

function toAbsolute(rootRelative: string): string {
    if (/^https?:\/\//.test(rootRelative)) return rootRelative;
    return `${baseUrl}${rootRelative}`;
}

export function getSeoForRoute(canonicalPath: string): ResolvedSeo {
    const entry = (routes as Record<string, EntryShape & { _audit?: string }>)[canonicalPath];
    if (!entry) throw new Error(`SEO catalog missing entry for ${canonicalPath}`);
    return {
        title: entry.title,
        description: entry.description,
        canonicalPath,
        canonicalUrl: canonicalPath === '/' ? `${baseUrl}/` : `${baseUrl}${canonicalPath}`,
        ogImage: toAbsolute(entry.ogImage),
        twitterImage: toAbsolute(entry.twitterImage ?? entry.ogImage),
        robots: resolveRobotsForRoute(canonicalPath, robots as { rules: import('./route-patterns').RobotsRule[] }),
        siteName: (defaults as { siteName: string }).siteName,
    };
}
