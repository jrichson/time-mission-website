/**
 * WebSite schema node for the brand site root.
 * Anchors the public site entity and attributes publisher ownership to
 * per-page schema nodes without adding unsupported search actions.
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
