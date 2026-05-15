import { tmMediaBase } from '../tm-media';

const BASE_URL = 'https://timemission.com';

export interface ImageObjectNode {
    '@type': 'ImageObject';
    '@id': string;
    url: string;
    name: string;
    caption?: string;
}

export interface VideoObjectNode {
    '@type': 'VideoObject';
    '@id': string;
    name: string;
    description: string;
    thumbnailUrl: string;
    contentUrl: string;
    uploadDate: string;
}

function absoluteUrl(pathOrUrl: string): string {
    if (/^https:\/\//.test(pathOrUrl)) return pathOrUrl;
    return `${BASE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function imageObjectNode(opts: {
    canonicalPath: string;
    idFragment: string;
    url: string;
    name: string;
    caption?: string;
}): ImageObjectNode {
    return {
        '@type': 'ImageObject',
        '@id': `${absoluteUrl(opts.canonicalPath)}#${opts.idFragment}`,
        url: absoluteUrl(opts.url),
        name: opts.name,
        ...(opts.caption ? { caption: opts.caption } : {}),
    };
}

export function videoObjectNode(opts: {
    canonicalPath: string;
    idFragment: string;
    name: string;
    description: string;
    thumbnailUrl: string;
    contentUrl: string;
    uploadDate: string;
}): VideoObjectNode {
    return {
        '@type': 'VideoObject',
        '@id': `${absoluteUrl(opts.canonicalPath)}#${opts.idFragment}`,
        name: opts.name,
        description: opts.description,
        thumbnailUrl: absoluteUrl(opts.thumbnailUrl),
        contentUrl: absoluteUrl(opts.contentUrl),
        uploadDate: opts.uploadDate,
    };
}

export function homeHeroMediaNodes(): Array<ImageObjectNode | VideoObjectNode> {
    const nodes: Array<ImageObjectNode | VideoObjectNode> = [
        imageObjectNode({
            canonicalPath: '/',
            idFragment: 'primaryimage',
            url: '/assets/video/hero-poster.jpg',
            name: 'Time Mission interactive mission rooms',
            caption: 'Time Mission teams compete through short, replayable mission rooms.',
        }),
    ];

    const mediaBase = tmMediaBase();
    if (mediaBase) {
        nodes.push(
            videoObjectNode({
                canonicalPath: '/',
                idFragment: 'hero-video',
                name: 'Time Mission challenge room overview',
                description:
                    'Hero video showing the active indoor Time Mission experience with teams moving through challenge rooms.',
                thumbnailUrl: '/assets/video/hero-poster.jpg',
                contentUrl: `${mediaBase}/assets/video/hero-bg-web.mp4`,
                uploadDate: '2026-05-09',
            }),
        );
    }

    return nodes;
}
