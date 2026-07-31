import i18nData from '../../data/site/i18n.json';
import { activeSiteProfile } from '../../lib/site-profile';

export function GET() {
    const languages = i18nData.languages.filter((language) =>
        activeSiteProfile.locales.includes(language.code),
    );
    const translations = Object.fromEntries(
        activeSiteProfile.locales
            .filter((code) => Object.prototype.hasOwnProperty.call(i18nData.translations, code))
            .map((code) => [code, i18nData.translations[code as keyof typeof i18nData.translations]]),
    );
    const profileCatalog = {
        ...i18nData,
        defaultLanguage: activeSiteProfile.defaultLocale,
        languages,
        translations,
    };

    return new Response(JSON.stringify(profileCatalog), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
