import i18nCatalog from '../data/site/i18n.json';

export type TranslationValue = string | string[];

export interface LanguageOption {
    code: string;
    htmlLang?: string;
    label?: string;
    nativeLabel?: string;
    shortLabel?: string;
}

export interface I18nCatalog {
    defaultLanguage: string;
    storageKey?: string;
    languages: LanguageOption[];
    translations: Record<string, Record<string, TranslationValue>>;
}

export interface LanguageView {
    code: string;
    htmlLang: string;
    label: string;
    nativeLabel: string;
    shortLabel: string;
}

export interface LanguageSurface {
    defaultLanguage: string;
    storageKey: string;
    languages: LanguageOption[];
    languageCodes: string[];
    translationKeys: string[];
    resolveLanguage(code?: string | null): LanguageOption | null;
    getLanguageView(code?: string | null): LanguageView | null;
    translate(key: string, code?: string | null): TranslationValue | null;
    translateString(key: string, code?: string | null): string | null;
    missingTranslationKeysFor(code: string): string[];
}

const defaultCatalog = i18nCatalog as I18nCatalog;

export function normalizeLanguageCode(code?: string | null): string {
    return String(code || '').trim().toLowerCase();
}

function baseLanguage(code: string): string {
    return normalizeLanguageCode(code).split('-')[0];
}

export function compileLanguageSurface(catalog: I18nCatalog = defaultCatalog): LanguageSurface {
    const languages = Array.isArray(catalog.languages) ? catalog.languages : [];
    const defaultLanguage = catalog.defaultLanguage || languages[0]?.code || 'en';
    const translations = catalog.translations || {};
    const defaultTranslations = translations[defaultLanguage] || {};
    const translationKeys = Object.keys(defaultTranslations).sort();

    function resolveLanguage(code?: string | null): LanguageOption | null {
        const normalized = normalizeLanguageCode(code);
        if (!normalized) return null;
        const exact = languages.find((language) => normalizeLanguageCode(language.code) === normalized);
        if (exact) return exact;
        const base = baseLanguage(normalized);
        return languages.find((language) => baseLanguage(language.code) === base) || null;
    }

    function languageOrDefault(code?: string | null): LanguageOption | null {
        return resolveLanguage(code) || resolveLanguage(defaultLanguage) || languages[0] || null;
    }

    function translate(key: string, code?: string | null): TranslationValue | null {
        const language = languageOrDefault(code);
        const langCode = language?.code || defaultLanguage;
        const active = translations[langCode] || {};
        if (Object.prototype.hasOwnProperty.call(active, key)) return active[key];
        return Object.prototype.hasOwnProperty.call(defaultTranslations, key)
            ? defaultTranslations[key]
            : null;
    }

    function getLanguageView(code?: string | null): LanguageView | null {
        const language = languageOrDefault(code);
        if (!language) return null;
        const label = translate('language.label', language.code);
        return {
            code: language.code,
            htmlLang: language.htmlLang || language.code,
            label: typeof label === 'string' ? label : language.label || language.code,
            nativeLabel: language.nativeLabel || language.label || language.code,
            shortLabel: language.shortLabel || language.code.toUpperCase(),
        };
    }

    return {
        defaultLanguage,
        storageKey: catalog.storageKey || 'tm_language',
        languages,
        languageCodes: languages.map((language) => language.code),
        translationKeys,
        resolveLanguage,
        getLanguageView,
        translate,
        translateString(key: string, code?: string | null): string | null {
            const value = translate(key, code);
            return typeof value === 'string' ? value : null;
        },
        missingTranslationKeysFor(code: string): string[] {
            const language = languageOrDefault(code);
            const active = language ? translations[language.code] || {} : {};
            return translationKeys.filter((key) => !Object.prototype.hasOwnProperty.call(active, key));
        },
    };
}

export const defaultLanguageSurface = compileLanguageSurface(defaultCatalog);
