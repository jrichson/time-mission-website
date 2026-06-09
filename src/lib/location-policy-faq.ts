import type { LocationRecord } from '../data/locations';

type LocationFaqSource = Pick<LocationRecord, 'faqs'>;
type LocationFaqItem = { q: string; a: string };

export const purchaseTermsFaqQuestion = 'What are the purchase terms and conditions?';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function isLocationFaqItem(value: unknown): value is LocationFaqItem {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as LocationFaqItem).q === 'string' &&
        typeof (value as LocationFaqItem).a === 'string'
    );
}

export function locationPurchaseTermsFaq(location: LocationFaqSource): LocationFaqItem | null {
    for (const item of location.faqs) {
        if (isLocationFaqItem(item) && item.q === purchaseTermsFaqQuestion) return item;
    }

    return null;
}

export function locationPurchaseTermsFaqItemHtml(location: LocationFaqSource): string {
    const faq = locationPurchaseTermsFaq(location);
    if (!faq) return '';

    return `
            <div class="mini-faq-item">
                <button class="mini-faq-q">
                    ${escapeHtml(faq.q)}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                <div class="mini-faq-a">
                    <p>${escapeHtml(faq.a)}</p>
                </div>
            </div>`;
}
