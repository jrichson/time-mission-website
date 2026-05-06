/**
 * WebSite schema node for the brand site root.
 * Adds the entity type Google uses for sitelinks searchbox eligibility and
 * for properly attributing the publisher to per-page Article/Service nodes.
 */
import org from '../../data/site/seo-organization.json';

export interface WebSiteNode {
    '@type': 'WebSite';
    '@id': string;
    url: string;
    name: string;
    inLanguage: string;
    publisher: { '@id': string };
}

export function websiteNode(): WebSiteNode {
    return {
        '@type': 'WebSite',
        '@id': `${org.url}/#website`,
        url: org.url,
        name: org.name,
        inLanguage: 'en-US',
        publisher: { '@id': org['@id'] },
    };
}
