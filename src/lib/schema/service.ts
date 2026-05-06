/**
 * Service schema node for group-event landing pages.
 * Surfaces these offerings as discrete commercial services in AI Overviews
 * and Perplexity citations for queries like "best birthday party venues" or
 * "team-building offsites near [city]".
 */
import org from '../../data/site/seo-organization.json';
import { allLocations } from '../../data/locations';

export interface ServiceNode {
    '@type': 'Service';
    '@id': string;
    name: string;
    serviceType: string;
    description: string;
    provider: { '@id': string };
    areaServed: string[];
    url: string;
}

const openCities = (): string[] =>
    allLocations
        .filter((l) => l.status === 'open')
        .map((l) => `${l.shortName}, ${l.address.state || l.address.country}`);

export function serviceNode(opts: {
    canonicalPath: string;
    name: string;
    serviceType: string;
    description: string;
}): ServiceNode {
    return {
        '@type': 'Service',
        '@id': `${org.url}${opts.canonicalPath}#service`,
        name: opts.name,
        serviceType: opts.serviceType,
        description: opts.description,
        provider: { '@id': org['@id'] },
        areaServed: openCities(),
        url: `${org.url}${opts.canonicalPath}`,
    };
}
