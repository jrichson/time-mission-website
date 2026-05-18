import routesRegistry from '../data/routes.json';

export interface PublicUrlRoute {
    canonicalPath: string;
    sitemap: boolean;
}

export interface PublicUrlRegistry {
    baseUrl: string;
    routes: PublicUrlRoute[];
    machineReadableRoutes?: PublicUrlRoute[];
    _meta?: {
        dynamicLandingPrefix?: string;
    };
}

const defaultRegistry = routesRegistry as PublicUrlRegistry;

export function normalizePublicPath(value: string): string {
    const raw = String(value || '').trim();
    if (!raw || raw === '/') return '/';
    const withoutHost = raw.replace(/^https?:\/\/timemission\.com/i, '');
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

export function registrySitemapUrls(registry: PublicUrlRegistry = defaultRegistry): string[] {
    const routes = [
        ...(registry.routes || []),
        ...(registry.machineReadableRoutes || []),
    ];
    return routes
        .filter((route) => route.sitemap === true)
        .map((route) => publicUrlForPath(route.canonicalPath, registry));
}
