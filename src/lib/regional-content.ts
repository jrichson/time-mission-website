import type { SiteProfile } from './site-profile';

export function regionalCorporateContactEmail(profile: SiteProfile): string {
    return profile.id === 'eu' ? 'info@timemission.eu' : 'info@timemission.com';
}

export function applyRegionalContentTokens(source: string, profile: SiteProfile): string {
    const siteDomain = new URL(profile.origin).hostname.replace(/^www\./, '');
    return source
        .replaceAll('{{CORPORATE_CONTACT_EMAIL}}', regionalCorporateContactEmail(profile))
        .replaceAll('{{SITE_DOMAIN}}', siteDomain)
        .replaceAll('{{SITE_ORIGIN}}', profile.origin);
}

export function splitHtmlSlot(source: string, marker: string, label: string): [string, string] {
    const parts = source.split(marker);
    if (parts.length !== 2) throw new Error(`${label} must appear exactly once`);
    return [parts[0], parts[1]];
}
