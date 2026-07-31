import { PAYLOAD_FETCH_TIMEOUT_MS } from './cms-origin';

interface PayloadListResponse {
    docs?: unknown[];
}

interface PayloadCollectionFetchOptions {
    collection: string;
    depth?: number;
    origin: string;
    optionalLabel?: string;
    strict?: boolean;
}

const collectionCache = new Map<string, Promise<unknown[]>>();

function collectionUrl(origin: string, collection: string, depth = 0): URL {
    const url = new URL(`/api/${collection}`, `${origin}/`);
    url.searchParams.set('limit', '250');
    url.searchParams.set('depth', String(depth));
    url.searchParams.sort();
    return url;
}

async function fetchPayloadCollectionRaw({
    collection,
    depth = 0,
    optionalLabel,
    origin,
    strict = false,
}: PayloadCollectionFetchOptions): Promise<unknown[]> {
    const url = collectionUrl(origin, collection, depth);
    const label = optionalLabel || collection;

    try {
        const res = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(PAYLOAD_FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
            const msg = `[payload] GET ${url} failed: ${res.status}`;
            if (strict) throw new Error(msg);
            console.warn(optionalLabel ? `[payload] optional ${label} skipped: GET ${url} failed: ${res.status}` : msg);
            return [];
        }
        const body = (await res.json()) as PayloadListResponse;
        return Array.isArray(body.docs) ? body.docs : [];
    } catch (err) {
        if (strict) throw err;
        console.warn(
            `[payload] ${optionalLabel ? `optional ${label}` : collection} fetch failed:`,
            err instanceof Error ? err.message : err,
        );
        return [];
    }
}

export async function fetchPayloadCollection<T>(options: PayloadCollectionFetchOptions): Promise<T[]> {
    const cacheKey = `${options.origin}::${options.collection}::${options.depth ?? 0}::${options.strict ? 'strict' : 'loose'}::${options.optionalLabel || ''}`;
    const cached = collectionCache.get(cacheKey);
    if (cached) return (await cached) as T[];

    const request = fetchPayloadCollectionRaw(options);
    collectionCache.set(cacheKey, request);
    return (await request) as T[];
}
