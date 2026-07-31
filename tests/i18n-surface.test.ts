import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import i18n from '../src/data/site/i18n.json';
import {
  compileLanguageSurface,
  defaultLanguageSurface,
  type I18nCatalog,
} from '../src/lib/i18n-surface';

const catalog = i18n as I18nCatalog;

describe('Language Surface', () => {
  it('resolves exact and base language codes with default fallback copy', () => {
    const surface = compileLanguageSurface(catalog);

    expect(surface.defaultLanguage).toBe('en');
    expect(surface.storageKey).toBe('tm_language');
    expect(surface.getLanguageView('es-MX')).toMatchObject({
      code: 'es',
      htmlLang: 'es',
    });
    expect(surface.resolveLanguage('nl')).toMatchObject({ code: 'nl', htmlLang: 'nl' });
    expect(surface.translateString('nav.about', 'fr-CA')).toBe('À propos');
    expect(surface.translateString('missing.key', 'es')).toBeNull();
  });

  it('keeps the shared catalog ready for both regional language sets', () => {
    const surface = compileLanguageSurface(catalog);

    expect(surface.languageCodes).toEqual(['en', 'es', 'nl', 'fr']);
    expect(Object.keys(catalog.translations).sort()).toEqual(['en', 'es', 'fr', 'nl']);
  });

  it('keeps every configured language aligned with default translation keys', () => {
    const surface = compileLanguageSurface(catalog);

    expect(surface.translationKeys.length).toBeGreaterThan(0);
    for (const code of surface.languageCodes) {
      expect(surface.missingTranslationKeysFor(code)).toEqual([]);
    }
  });

  it('exports the default public-site catalog surface', () => {
    expect(defaultLanguageSurface.languageCodes).toEqual(catalog.languages.map((language) => language.code));
    expect(defaultLanguageSurface.translateString('language.label', 'en')).toBe('Language');
  });

  it('emits the runtime config consumed by the public language switcher', () => {
    const runtimeConfig = compileLanguageSurface(catalog).toRuntimeConfig();

    expect(runtimeConfig).toMatchObject({
      defaultLanguage: 'en',
      storageKey: 'tm_language',
    });
    expect(runtimeConfig.languages.map((language) => language.code)).toEqual(['en', 'es', 'nl', 'fr']);
    expect(runtimeConfig.translations.es['booking.chooseLocation.title']).toBeTruthy();
    expect(runtimeConfig.translations.fr['consent.preferencesTitle']).toBe('Préférences de cookies');
  });

  it('keeps translated rich text on the approved HTML allowlist', () => {
    const languageSwitcher = fs.readFileSync(path.join(process.cwd(), 'js/language-switcher.js'), 'utf8');
    expect(languageSwitcher).toContain('function sanitizeTranslatedHtml');
    expect(languageSwitcher).toContain('sanitizeTranslatedHtml(value)');

    const richTextKeys = Object.keys(catalog.translations.en).filter((key) => key.endsWith('Html'));
    expect(richTextKeys).toEqual(['home.about.longHtml']);

    for (const translations of Object.values(catalog.translations)) {
      for (const key of richTextKeys) {
        const html = translations[key];
        expect(typeof html).toBe('string');
        const tags = String(html).match(/<[^>]+>/g) || [];
        for (const tag of tags) {
          expect(tag).toMatch(/^<\/?strong>$|^<span class="copy-emphasis">$|^<\/span>$/);
        }
      }
    }
  });
});
