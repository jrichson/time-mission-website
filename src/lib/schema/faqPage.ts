export interface FaqItem {
    q: string;
    a: string;
}

export interface FaqPageNode {
    '@type': 'FAQPage';
    mainEntity: Array<{
        '@type': 'Question';
        name: string;
        acceptedAnswer: { '@type': 'Answer'; text: string };
    }>;
}

export function faqPageNode(items: FaqItem[]): FaqPageNode {
    return {
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
    };
}
