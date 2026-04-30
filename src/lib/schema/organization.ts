import org from '../../data/site/seo-organization.json';

export interface OrganizationNode {
    '@type': 'Organization';
    '@id': string;
    name: string;
    url: string;
    logo: string;
    sameAs: string[];
}

export function organizationNode(): OrganizationNode {
    return {
        '@type': 'Organization',
        '@id': org['@id'],
        name: org.name,
        url: org.url,
        logo: org.logo,
        sameAs: org.sameAs,
    };
}
