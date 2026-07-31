import routesRegistry from '../data/routes.json';
import { activeSiteProfile } from './site-profile';

export interface PublicUrlRoute {
    id?: string;
    canonicalPath: string;
    externalUrl?: string;
    locationAlternate?: string;
    locationCompatibilitySources?: string[];
    outputFile?: string;
    redirectSources?: string[];
    sitemap: boolean;
    status?: number;
}

export interface PublicUrlAlias {
    allowExternal?: boolean;
    externalAllowlistReason?: string;
    source: string;
    target: string;
    status: number;
}

export interface PublicUrlRegistry {
    baseUrl: string;
    routes: PublicUrlRoute[];
    aliases?: PublicUrlAlias[];
    machineReadableRoutes?: PublicUrlRoute[];
    _meta?: {
        dynamicLandingPrefix?: string;
    };
}

export interface PublicUrlSitemapEntry {
    canonicalPath: string;
    url: string;
    route: PublicUrlRoute;
}

export interface PublicUrlRedirectPair {
    source: string;
    target: string;
    status: number;
}

export interface PublicUrlSurface {
    baseUrl: string;
    rootHome: string;
    routes: PublicUrlRoute[];
    aliases: PublicUrlAlias[];
    dynamicLandingPrefix: string;
    sitemapEntries: PublicUrlSitemapEntry[];
    sitemapUrls: string[];
    redirectPairs: PublicUrlRedirectPair[];
    canonicalPaths: Set<string>;
    routeFor(canonicalPath: string): PublicUrlRoute | null;
    outputFileFor(canonicalPath: string): string;
    publicUrlFor(canonicalPath: string): string;
    isKnownCanonical(canonicalPath: string): boolean;
}

const defaultRegistry = {
    ...(routesRegistry as PublicUrlRegistry),
    baseUrl: activeSiteProfile.origin,
} as PublicUrlRegistry;

export function normalizePublicPath(value: string): string {
    const raw = String(value || '').trim();
    if (!raw || raw === '/') return '/';
    const withoutHost = raw.replace(/^https?:\/\/(?:www\.)?timemission\.(?:com|eu)/i, '');
    const path = withoutHost.split('#')[0].split('?')[0] || '/';
    const withSlash = path.startsWith('/') ? path : `/${path}`;
    return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : '/';
}

export function publicUrlForPath(
    canonicalPath: string,
    registry: PublicUrlRegistry = defaultRegistry,
): string {
    const baseUrl = registry.baseUrl.replace(/\/+$/, '');
    const path = normalizePublicPath(canonicalPath);
    return path === '/' ? `${baseUrl}/` : `${baseUrl}${path}`;
}

export function dynamicLandingPrefix(registry: PublicUrlRegistry = defaultRegistry): string {
    const raw = registry._meta?.dynamicLandingPrefix || '/c';
    return raw.startsWith('/') ? raw : `/${raw}`;
}

export function isDynamicLandingPath(
    canonicalPath: string,
    registry: PublicUrlRegistry = defaultRegistry,
): boolean {
    const prefix = dynamicLandingPrefix(registry);
    const normalized = normalizePublicPath(canonicalPath);
    if (!normalized.startsWith(`${prefix}/`)) return false;
    const slug = normalized.slice(prefix.length + 1).replace(/\/+$/, '');
    if (!slug || slug.includes('/') || slug.includes('.')) return false;
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function publicUrlSitemapEntries(registry: PublicUrlRegistry = defaultRegistry): PublicUrlSitemapEntry[] {
    return (registry.routes || [])
        .filter((route) => route.sitemap === true)
        .map((route) => ({
            canonicalPath: normalizePublicPath(route.canonicalPath),
            url: publicUrlForPath(route.canonicalPath, registry),
            route,
        }));
}

export function registrySitemapUrls(registry: PublicUrlRegistry = defaultRegistry): string[] {
    return publicUrlSitemapEntries(registry).map((entry) => entry.url);
}

export function locationScopedCanonicalPaths(
    locationPaths: Iterable<string>,
    registry: PublicUrlRegistry = defaultRegistry,
): string[] {
    const excluded = new Set(Array.from(locationPaths, normalizePublicPath));
    return (registry.routes || [])
        .map((route) => normalizePublicPath(route.canonicalPath))
        .filter((path) => path && !excluded.has(path));
}

export function publicUrlRedirectPairs(registry: PublicUrlRegistry = defaultRegistry): PublicUrlRedirectPair[] {
    const pairs: PublicUrlRedirectPair[] = [];
    for (const route of registry.routes || []) {
        const target = route.externalUrl || normalizePublicPath(route.canonicalPath);
        for (const source of route.redirectSources || []) {
            pairs.push({
                source,
                target,
                status: route.status || 301,
            });
        }
    }
    for (const alias of registry.aliases || []) {
        pairs.push({
            source: alias.source,
            target: alias.target,
            status: alias.status,
        });
    }
    return pairs;
}

export function compilePublicUrlSurface(registry: PublicUrlRegistry = defaultRegistry): PublicUrlSurface {
    const canonicalToRoute = new Map<string, PublicUrlRoute>();
    const canonicalPaths = new Set<string>();
    for (const route of registry.routes || []) {
        const canonical = normalizePublicPath(route.canonicalPath);
        canonicalPaths.add(canonical);
        canonicalToRoute.set(canonical, route);
    }
    const prefix = dynamicLandingPrefix(registry);
    const sitemapEntries = publicUrlSitemapEntries(registry);
    return {
        baseUrl: registry.baseUrl.replace(/\/+$/, ''),
        rootHome: publicUrlForPath('/', registry),
        routes: registry.routes || [],
        aliases: registry.aliases || [],
        dynamicLandingPrefix: prefix,
        sitemapEntries,
        sitemapUrls: sitemapEntries.map((entry) => entry.url),
        redirectPairs: publicUrlRedirectPairs(registry),
        canonicalPaths,
        routeFor(canonicalPath: string) {
            return canonicalToRoute.get(normalizePublicPath(canonicalPath)) || null;
        },
        outputFileFor(canonicalPath: string) {
            return String(canonicalToRoute.get(normalizePublicPath(canonicalPath))?.outputFile || '').replace(/^\//, '');
        },
        publicUrlFor(canonicalPath: string) {
            return publicUrlForPath(canonicalPath, registry);
        },
        isKnownCanonical(canonicalPath: string) {
            const normalized = normalizePublicPath(canonicalPath);
            return canonicalPaths.has(normalized) || isDynamicLandingPath(normalized, registry);
        },
    };
}
