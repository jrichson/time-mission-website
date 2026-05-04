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

/** CMS landing head fields (from Payload) — avoids seo-routes.json entries for /c/* */
export interface LandingHeadInput {
    metaTitle: string;
    metaDescription: string;
    robots: string;
    canonicalOverride?: string | null;
    ogImage: string;
    twitterImage?: string | null;
}

const baseUrl = 'https://timemission.com';

function toAbsolute(rootRelative: string): string {
    if (/^https?:\/\//.test(rootRelative)) return rootRelative;
    return `${baseUrl}${rootRelative}`;
}

export function resolveLandingHeadSeo(canonicalPath: string, landing: LandingHeadInput): ResolvedSeo {
    const override = landing.canonicalOverride?.trim();
    let canonicalUrl: string;
    if (override && /^https:\/\//.test(override)) {
        canonicalUrl = override;
    } else {
        canonicalUrl = canonicalPath === '/' ? `${baseUrl}/` : `${baseUrl}${canonicalPath}`;
    }
    const twitter = landing.twitterImage?.trim() || landing.ogImage;
    const siteName = (defaults as { siteName: string }).siteName;
    return {
        title: landing.metaTitle,
        description: landing.metaDescription,
        canonicalPath,
        canonicalUrl,
        ogImage: toAbsolute(landing.ogImage),
        twitterImage: toAbsolute(twitter),
        robots:
            landing.robots && landing.robots.length
                ? landing.robots
                : resolveRobotsForRoute(canonicalPath, robots as { rules: import('./route-patterns').RobotsRule[] }),
        siteName,
    };
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
