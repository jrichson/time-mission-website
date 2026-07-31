/**
 * WebSite schema node for the brand site root.
 * Anchors the public site entity and attributes publisher ownership to
 * per-page schema nodes without adding unsupported search actions.
 */
import org from '../../data/site/seo-organization.json';
import { activeSiteProfile } from '../site-profile';

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
        '@id': `${activeSiteProfile.origin}/#website`,
        url: activeSiteProfile.origin,
        name: org.name,
        inLanguage: activeSiteProfile.id === 'us' ? 'en-US' : activeSiteProfile.defaultLocale,
        publisher: { '@id': org['@id'] },
    };
}
