export interface Crumb {
    label: string;
    href: string;
}

export interface BreadcrumbNode {
    '@type': 'BreadcrumbList';
    itemListElement: Array<{
        '@type': 'ListItem';
        position: number;
        name: string;
        item: string;
    }>;
}

const baseUrl = 'https://timemission.com';

function toAbsolute(href: string): string {
    if (/^https?:\/\//.test(href)) return href;
    return href === '/' ? `${baseUrl}/` : `${baseUrl}${href}`;
}

export function breadcrumbNode(crumbs: Crumb[]): BreadcrumbNode {
    return {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.label,
            item: toAbsolute(c.href),
        })),
    };
}
