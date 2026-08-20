import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import approvals from '../src/data/site/i18n-approval.json';
import pageI18n from '../src/data/site/page-i18n.json';
import {
  collectPageCopyEntries,
  collectPageCopyKeys,
  localizePageCopy,
  pageTranslationsFor,
  preservedSourceTermsFor,
} from '../scripts/lib/page-i18n.mjs';

const missionsMarkup = fs.readFileSync(
  new URL('../src/partials/missions-main.frag.txt', import.meta.url),
  'utf8',
);
const missionNamePairs = [...missionsMarkup.matchAll(/<article class="portal-card[\s\S]*?<\/article>/g)]
  .map(([card]) => ({
    display: card.match(/class="portal-title"[^>]*>([^<]+)</)?.[1]?.trim() || '',
    imageAlt: card.match(/<img\b[^>]*\balt="([^"]+)"/)?.[1]?.trim() || '',
  }));
const homeSloganSource = 'Step into the mission. Teams of 2–5 compete through 25+ immersive missions at Time Mission, test your speed, strength, skill, and smarts.';
const catalogTranslationLayers = [
  ...Object.entries(pageI18n.translations).map(([locale, translations]) => ({
    scope: locale,
    translations,
  })),
  ...Object.entries(pageI18n._profiles || {}).flatMap(([profileId, profile]) => (
    Object.entries(profile.translations || {}).map(([locale, translations]) => ({
      scope: `${profileId}.${locale}`,
      translations,
    }))
  )),
];

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

    const localized = localizePageCopy(source, 'fr', catalog, {
      canonicalPath: '/groups/field-trips',
    });
    expect(localized).toContain('<span>SORTIES</span> <span>SCOLAIRES</span>');
  });

  it('merges profile-specific language copy without leaking it to other sites', () => {
    const catalog = {
      translations: { es: { Shared: 'Compartido' } },
      _profiles: {
        us: {
          translations: { es: { 'US only': 'Solo EE. UU.' } },
          preservedSourceTerms: { es: ['Philadelphia'] },
        },
      },
    };

    expect(pageTranslationsFor(catalog, 'es', { canonicalPath: '/', profileId: 'us' })).toMatchObject({
      Shared: 'Compartido',
      'US only': 'Solo EE. UU.',
    });
    expect(pageTranslationsFor(catalog, 'es', { canonicalPath: '/', profileId: 'eu' }))
      .not.toHaveProperty('US only');
    expect(preservedSourceTermsFor(catalog, 'es', { profileId: 'us' })).toContain('Philadelphia');
    expect(preservedSourceTermsFor(catalog, 'es', { profileId: 'eu' })).not.toContain('Philadelphia');
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
    for (const { scope, translations } of catalogTranslationLayers) {
      for (const [source, translated] of Object.entries(translations)) {
        const brandReferences = source.match(/Time Mission/gi) || [];
        const translatedBrandReferences = String(translated).match(/Time Mission/g) || [];
        expect(translatedBrandReferences, `${scope}: ${source}`).toHaveLength(brandReferences.length);
        expect(translated, `${scope}: ${source}`).not.toMatch(/TMQBRAND|data-tm=|<[^>]+>/i);

        for (const email of source.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || []) {
          expect(translated, `${scope}: ${source}`).toContain(email);
        }
        if (source.startsWith('"') && source.endsWith('"')) {
          expect(translated.startsWith('"'), `${scope}: ${source}`).toBe(true);
          expect(translated.endsWith('"'), `${scope}: ${source}`).toBe(true);
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

  it('requires review of the newly routed US language artifacts', () => {
    expect(approvals.us.en).toMatchObject({ status: 'review_required' });
    expect(approvals.us.es).toMatchObject({ status: 'review_required' });
  });

  it('requires language review without a separate legal approval', () => {
    const policyCopy = [
      approvals._policy.scope,
      approvals._policy.approvedMeaning,
      pageI18n._policy.review,
      ...Object.values(approvals.us).map((record) => record.reason),
      ...Object.values(approvals.eu).map((record) => record.reason),
    ].join(' ');

    expect(policyCopy).toContain('language');
    expect(approvals._policy.scope).toContain('legal-page text');
    expect(policyCopy).not.toMatch(/\blegal review\b|\brequires? legal\b/i);
    expect(approvals._policy.approvedMeaning).toContain('not legal sign-off');
  });

  it('covers US-only Spanish page copy and preserves only declared source terms', () => {
    const translations = pageI18n._profiles.us.translations.es;
    const preserved = preservedSourceTermsFor(pageI18n, 'es', { profileId: 'us' });

    expect(Object.keys(translations).length).toBeGreaterThan(300);
    for (const [source, translated] of Object.entries(translations)) {
      expect(translated.trim(), source).not.toBe('');
      if (translated === source) expect(preserved, source).toContain(source);
    }

    expect(pageTranslationsFor(pageI18n, 'es', { canonicalPath: '/', profileId: 'eu' }))
      .not.toHaveProperty('Where is Time Mission located?');
  });

  it('covers the Houston campaign pages in US Spanish without translating the promo code', () => {
    const translations = pageI18n._profiles.us.translations.es;
    const preserved = preservedSourceTermsFor(pageI18n, 'es', { profileId: 'us' });
    const campaignSources = [
      'School Night Sale | Time Mission Houston',
      'Get $10 off 90- and 120-minute missions at Time Mission Houston on Sunday evenings and Monday through Thursday through September 30, 2026.',
      'A group taking on an interactive challenge at Time Mission',
      'Houston · Through September 30',
      'School Nights',
      'Are on Sale',
      'School is back, but not every school night has to be boring.',
      'Get $10 off 90 and 120 minute missions at Time Mission Houston on school nights. Sundays after 6PM and all day Monday through Thursday.',
      'Book with the button below or use code',
      'SCHOOLNIGHT',
      '. Runs through September 30.',
      'Discount valid Sundays from 6PM to close and all day Monday through Thursday, now through September 30, 2026. Valid on 90 and 120 minute sessions only. 60 minute sessions excluded. Not valid Friday or Saturday. Not valid Labor Day weekend, September 5 through September 7. Valid at Time Mission Houston only. Discount applies when you book through this page or enter code SCHOOLNIGHT at checkout. Two ticket minimum. Cannot be combined with other offers, promotions, or discounts. Not valid on gift cards, group bookings, or private events. Subject to availability. Time Mission reserves the right to modify or end this promotion at any time.',
      'Educators Free Through September 30 | Time Mission Houston',
      'Houston K-12 educators, administrators, and school staff can claim one free mission at Time Mission Houston through September 30, 2026.',
      'Three educators taking on the Control Room challenge at Time Mission',
      'Houston · Educator Appreciation',
      'Educators Free',
      'Through Sept 30',
      "School is back, and you've earned a night that has nothing to do with lesson plans.",
      "Every educator gets a free mission at Time Mission Houston through September 30. Any session length, any night we're open. Fill out the form below, we'll send you a link with your promo code, and you show your school ID when you check in.",
      'Educator signup form',
      'One free ticket per educator, valid through September 30, 2026. Valid at Time Mission Houston only. Available to K-12 teachers, administrators, and school staff with a valid school ID. Promo code link is sent by email after signup and must be redeemed by the person named on the signup. Valid school ID required at check-in. Valid any day and any session length, subject to availability. Two ticket minimum applies to all bookings. Cannot be combined with other offers, promotions, or discounts, including the School Night Sale. Not transferable, not redeemable for cash, and no cash value. Time Mission reserves the right to modify or end this promotion at any time.',
    ];

    for (const source of campaignSources) {
      expect(translations[source], source).toBeTypeOf('string');
      expect(translations[source].trim(), source).not.toBe('');
    }
    expect(translations['School Night Sale | Time Mission Houston'])
      .toBe('Oferta para noches escolares | Time Mission Houston');
    expect(translations.SCHOOLNIGHT).toBe('SCHOOLNIGHT');
    for (const source of campaignSources) {
      expect(preserved.has(source), source).toBe(source === 'SCHOOLNIGHT');
    }
    for (const source of campaignSources.filter((entry) => entry !== 'SCHOOLNIGHT')) {
      expect(translations[source], source).not.toBe(source);
    }
  });

  it('covers every TM Ops educator page in US Spanish', () => {
    const translations = pageI18n._profiles.us.translations.es;

    for (const locationName of ['Manassas', 'Mount Prospect', 'Orland Park']) {
      const sources = [
        `Educators Free Through September 30 | Time Mission ${locationName}`,
        `${locationName} K-12 educators, administrators, and school staff can claim one free mission at Time Mission ${locationName} through September 30, 2026.`,
        `${locationName} · Educator Appreciation`,
        `Every educator gets a free mission at Time Mission ${locationName} through September 30. Any session length, any night we're open. Fill out the form below, we'll send you a link with your promo code, and you show your school ID when you check in.`,
        `One free ticket per educator, valid through September 30, 2026. Valid at Time Mission ${locationName} only. Available to K-12 teachers, administrators, and school staff with a valid school ID. Promo code link is sent by email after signup and must be redeemed by the person named on the signup. Valid school ID required at check-in. Valid any day and any session length, subject to availability. Two ticket minimum applies to all bookings. Cannot be combined with other offers, promotions, or discounts, including the School Night Sale. Not transferable, not redeemable for cash, and no cash value. Time Mission reserves the right to modify or end this promotion at any time.`,
      ];

      for (const source of sources) {
        expect(translations[source], source).toBeTypeOf('string');
        expect(translations[source].trim(), source).not.toBe('');
        expect(translations[source], source).not.toBe(source);
      }
    }
  });

  it('keeps the home slogan and every proper mission name in English', () => {
    expect(missionNamePairs).toHaveLength(30);
    expect(missionNamePairs.every(({ display, imageAlt }) => display && imageAlt)).toBe(true);

    for (const locale of ['nl', 'fr', 'es']) {
      const translations = pageI18n.translations[locale];
      const preserved = preservedSourceTermsFor(pageI18n, locale);

      expect(translations[homeSloganSource]).toMatch(/^Step into the mission\./);
      for (const { display, imageAlt } of missionNamePairs) {
        expect(translations[display], `${locale}: catalog ${display}`).toBe(display);
        expect(translations[imageAlt], `${locale}: catalog ${imageAlt}`).toBe(imageAlt);
        const localized = localizePageCopy(
          `<main><h2>${display}</h2><img alt="${imageAlt}"></main>`,
          locale,
          pageI18n,
        );
        expect(localized, `${locale}: ${display}`).toContain(`<h2>${display}</h2>`);
        expect(localized, `${locale}: ${imageAlt}`).toContain(`alt="${imageAlt}"`);
        expect(preserved.has(display), `${locale}: preserve ${display}`).toBe(true);
        expect(preserved.has(imageAlt), `${locale}: preserve ${imageAlt}`).toBe(true);
      }

      for (const genericCopy of ['BOOK YOUR MISSION', 'MISSION BRIEFING', 'THE MISSIONS']) {
        expect(translations[genericCopy], `${locale}: translate ${genericCopy}`)
          .not.toBe(genericCopy);
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
