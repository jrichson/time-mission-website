import { allLocations } from '../../data/locations';
import { articleNode } from './article';
import { organizationNode } from './organization';
import { websiteNode } from './website';
import { serviceNode } from './service';
import { breadcrumbNode, type Crumb } from './breadcrumb';
import { localBusinessNode } from './localBusiness';
import { homeHeroMediaNodes } from './media';

interface Graph {
    '@context': 'https://schema.org';
    '@graph': unknown[];
}

function withContext(nodes: unknown[]): Graph {
    return { '@context': 'https://schema.org', '@graph': nodes };
}

/** Safely encode for embedding in a <script type="application/ld+json"> body. */
export function serializeGraph(graph: Graph): string {
    return JSON.stringify(graph).replace(/</g, '\\u003c');
}

export function buildHomeGraph(): Graph {
    return withContext([organizationNode(), websiteNode(), ...homeHeroMediaNodes()]);
}

export function buildSimpleGraph(crumbs?: Crumb[], extraNodes: unknown[] = []): Graph {
    const nodes: unknown[] = [organizationNode()];
    if (crumbs && crumbs.length > 1) nodes.push(breadcrumbNode(crumbs));
    nodes.push(...extraNodes);
    return withContext(nodes);
}

export function buildArticleGraph(opts: {
    canonicalPath: string;
    crumbs: Crumb[];
    datePublished: string;
    description: string;
    headline: string;
    image: string;
    newsArticle?: boolean;
}): Graph {
    return withContext([
        organizationNode(),
        breadcrumbNode(opts.crumbs),
        articleNode(opts),
    ]);
}

/**
 * Builds the graph for a group-event landing page. Adds a Service node
 * alongside the standard Organization + BreadcrumbList so AI search
 * engines treat each /groups/<type> page as a distinct commercial offering.
 * Visible FAQs stay on-page, but FAQPage JSON-LD is intentionally omitted
 * because Google restricts FAQ rich results to government and health sites.
 */
export function buildGroupEventGraph(opts: {
    canonicalPath: string;
    crumbs: Crumb[];
    serviceName: string;
    serviceType: string;
    serviceDescription: string;
    faqs?: unknown[];
}): Graph {
    const nodes: unknown[] = [
        organizationNode(),
        breadcrumbNode(opts.crumbs),
        serviceNode({
            canonicalPath: opts.canonicalPath,
            name: opts.serviceName,
            serviceType: opts.serviceType,
            description: opts.serviceDescription,
        }),
    ];
    return withContext(nodes);
}

export function buildFaqGraph(): Graph {
    return withContext([organizationNode()]);
}

export function buildLocationGraph(slug: string, canonicalPath: string, crumbs: Crumb[]): Graph {
    const loc = allLocations.find((l) => l.slug === slug);
    if (!loc) throw new Error(`buildLocationGraph: unknown slug ${slug}`);

    const nodes: unknown[] = [organizationNode(), breadcrumbNode(crumbs)];

    const business = localBusinessNode(loc, canonicalPath);
    if (business) nodes.push(business);

    return withContext(nodes);
}
