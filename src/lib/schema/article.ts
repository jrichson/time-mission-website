import org from '../../data/site/seo-organization.json';
import { activeSiteProfile } from '../site-profile';

export interface ArticleNode {
    '@type': 'Article' | 'NewsArticle';
    '@id': string;
    headline: string;
    description: string;
    image: string;
    datePublished: string;
    mainEntityOfPage: {
        '@type': 'WebPage';
        '@id': string;
    };
    author: { '@id': string };
    publisher: { '@id': string };
    url: string;
}

function absoluteUrl(pathOrUrl: string): string {
    if (/^https:\/\//.test(pathOrUrl)) return pathOrUrl;
    return `${activeSiteProfile.origin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function articleNode(opts: {
    canonicalPath: string;
    datePublished: string;
    description: string;
    headline: string;
    image: string;
    newsArticle?: boolean;
}): ArticleNode {
    const url = absoluteUrl(opts.canonicalPath);

    return {
        '@type': opts.newsArticle ? 'NewsArticle' : 'Article',
        '@id': `${url}#article`,
        headline: opts.headline,
        description: opts.description,
        image: absoluteUrl(opts.image),
        datePublished: opts.datePublished,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': url,
        },
        author: { '@id': org['@id'] },
        publisher: { '@id': org['@id'] },
        url,
    };
}
