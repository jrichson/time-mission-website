import { allLocations } from '../../data/locations';
import faqsDoc from '../../data/site/faqs.json';
import { organizationNode } from './organization';
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
    return withContext([organizationNode()]);
}

export function buildSimpleGraph(crumbs?: Crumb[]): Graph {
    const nodes: unknown[] = [organizationNode()];
    if (crumbs && crumbs.length > 1) nodes.push(breadcrumbNode(crumbs));
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
