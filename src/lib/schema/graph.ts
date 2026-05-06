import { allLocations } from '../../data/locations';
import faqsDoc from '../../data/site/faqs.json';
import { organizationNode } from './organization';
import { websiteNode } from './website';
import { serviceNode } from './service';
import { breadcrumbNode, type Crumb } from './breadcrumb';
import { localBusinessNode } from './localBusiness';
import { faqPageNode, type FaqItem } from './faqPage';

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
    return withContext([organizationNode(), websiteNode()]);
}

export function buildSimpleGraph(crumbs?: Crumb[]): Graph {
    const nodes: unknown[] = [organizationNode()];
    if (crumbs && crumbs.length > 1) nodes.push(breadcrumbNode(crumbs));
    return withContext(nodes);
}

/**
 * Builds the graph for a group-event landing page. Adds Service + FAQPage
 * nodes alongside the standard Organization + BreadcrumbList so AI search
 * engines treat each /groups/<type> page as a distinct commercial offering.
 */
export function buildGroupEventGraph(opts: {
    canonicalPath: string;
    crumbs: Crumb[];
    serviceName: string;
    serviceType: string;
    serviceDescription: string;
    faqs?: FaqItem[];
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
    if (opts.faqs && opts.faqs.length > 0) {
        nodes.push(faqPageNode(opts.faqs));
    }
    return withContext(nodes);
}

export function buildFaqGraph(): Graph {
    const items: FaqItem[] = (faqsDoc.sections as Array<{ items: FaqItem[] }>).flatMap((s) => s.items);
    return withContext([organizationNode(), faqPageNode(items)]);
}

export function buildLocationGraph(slug: string, canonicalPath: string, crumbs: Crumb[]): Graph {
    const loc = allLocations.find((l) => l.slug === slug);
    if (!loc) throw new Error(`buildLocationGraph: unknown slug ${slug}`);

    const nodes: unknown[] = [organizationNode(), breadcrumbNode(crumbs)];

    const business = localBusinessNode(loc, canonicalPath);
    if (business) nodes.push(business);

    if (loc.status === 'open' && Array.isArray(loc.faqs) && loc.faqs.length > 0) {
        nodes.push(faqPageNode(loc.faqs as FaqItem[]));
    }
    return withContext(nodes);
}
