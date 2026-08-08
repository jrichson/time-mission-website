import { describe, expect, it } from 'vitest';

import approvals from '../src/data/site/i18n-approval.json';
import pageI18n from '../src/data/site/page-i18n.json';
import {
  collectPageCopyEntries,
  collectPageCopyKeys,
  localizePageCopy,
  preservedSourceTermsFor,
} from '../scripts/lib/page-i18n.mjs';

describe('page translation catalog', () => {
  it('localizes page copy and metadata without changing shared or deferred surfaces', () => {
    const source = `<!doctype html><html><head>
      <title>About Time Mission</title>
      <meta name="description" content="An immersive adventure">
    </head><body><main>
      <h1 aria-label="Our Story">Our Story</h1>
      <section hidden><h2>General Inquiries</h2></section>
      <select><optgroup label="Europe"><option>Antwerp</option></optgroup></select>
      <p data-i18n="shared.copy">Shared Copy</p>
      <section class="newsletter-section"><h2>Newsletter Copy</h2></section>
      <script>window.example = 'Our Story'</script>
    </main></body></html>`;
    const catalog = {
      translations: {
        fr: {
          'About Time Mission': 'À propos de Time Mission',
          'An immersive adventure': 'Une aventure immersive',
          'Our Story': 'Notre histoire',
          'General Inquiries': 'Demandes générales',
          Europe: 'Europe',
          Antwerp: 'Anvers',
          'Shared Copy': 'Copie partagée',
          'Newsletter Copy': 'Texte de la newsletter',
        },
      },
    };

    const localized = localizePageCopy(source, 'fr', catalog);

    expect(localized).toContain('<title>À propos de Time Mission</title>');
    expect(localized).toContain('content="Une aventure immersive"');
    expect(localized).toContain('<h1 aria-label="Notre histoire">Notre histoire</h1>');
    expect(localized).toContain('<section hidden><h2>Demandes générales</h2></section>');
    expect(localized).toContain('<optgroup label="Europe"><option>Anvers</option></optgroup>');
    expect(localized).toContain('data-i18n="shared.copy">Shared Copy</p>');
    expect(localized).toContain('<h2>Newsletter Copy</h2>');
    expect(localized).toContain("window.example = 'Our Story'");
  });

  it('uses route-specific wording when the same English fragment needs context', () => {
    const source = '<html><body><main><h1><span>FIELD</span> <span>TRIPS</span></h1></main></body></html>';
    const catalog = {
      translations: { fr: { FIELD: 'TERRAIN', TRIPS: 'VOYAGES' } },
      routes: {
        '/groups/field-trips': {
          fr: { FIELD: 'SORTIES', TRIPS: 'SCOLAIRES' },
        },
      },
    };

    const localized = localizePageCopy(source, 'fr', catalog, '/groups/field-trips');
    expect(localized).toContain('<span>SORTIES</span> <span>SCOLAIRES</span>');
  });

  it('collects only page-owned visible copy', () => {
    const source = `<html><head><title>Page title</title>
      <meta property="og:description" content="Social gaming venue">
    </head><body><main><h1>Mission Briefing</h1>
      <img alt="Players in a mission room" src="/example.webp">
      <span data-i18n="nav.bookNow">Book Now</span>
      <button aria-label="Previous experience" data-i18n-aria-label="home.missions.previous"></button>
      <section class="newsletter-section">Newsletter Copy</section>
    </main></body></html>`;

    expect(collectPageCopyKeys(source)).toEqual([
      'Mission Briefing',
      'Page title',
      'Players in a mission room',
      'Social gaming venue',
    ]);
  });

  it('keeps every localized page catalog aligned to the same English source keys', () => {
    const keySets = Object.values(pageI18n.translations)
      .map((translations) => Object.keys(translations).sort());

    expect(keySets[0].length).toBeGreaterThan(0);
    for (const keys of keySets.slice(1)) expect(keys).toEqual(keySets[0]);
    for (const translations of Object.values(pageI18n.translations)) {
      expect(Object.values(translations).every((value) => typeof value === 'string' && value.trim())).toBe(true);
    }
  });

  it('preserves the Time Mission brand and machine-safe plain text in every locale', () => {
    for (const translations of Object.values(pageI18n.translations)) {
      for (const [source, translated] of Object.entries(translations)) {
        const brandReferences = source.match(/Time Mission/gi) || [];
        const translatedBrandReferences = String(translated).match(/Time Mission/g) || [];
        expect(translatedBrandReferences).toHaveLength(brandReferences.length);
        expect(translated).not.toMatch(/TMQBRAND|data-tm=|<[^>]+>/i);

        for (const email of source.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || []) {
          expect(translated).toContain(email);
        }
        if (source.startsWith('"') && source.endsWith('"')) {
          expect(translated.startsWith('"')).toBe(true);
          expect(translated.endsWith('"')).toBe(true);
        }
      }
    }
  });

  it('does not allow translated EU pages to bypass unchanged-copy validation', () => {
    for (const locale of ['nl', 'fr', 'es']) {
      expect(approvals.eu[locale]).not.toHaveProperty('allowUnchangedFields');
      const preserved = preservedSourceTermsFor(pageI18n, locale);
      for (const [source, translated] of Object.entries(pageI18n.translations[locale])) {
        if (translated === source) expect(preserved).toContain(source);
      }
    }
  });

  it('preserves page-copy entry order after localization', () => {
    const source = '<html><head><title>Page title</title></head><body><main><p>Hello crew</p></main></body></html>';
    const localized = localizePageCopy(source, 'nl', {
      translations: { nl: { 'Page title': 'Paginatitel', 'Hello crew': 'Hallo team' } },
    });

    expect(collectPageCopyEntries(localized)).toEqual([
      { kind: 'text', value: 'Paginatitel' },
      { kind: 'text', value: 'Hallo team' },
    ]);
  });
});
