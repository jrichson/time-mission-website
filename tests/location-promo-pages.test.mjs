import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('location campaign pages', () => {
  it('retires every School Night page to its location homepage', () => {
    const routes = JSON.parse(read('src/data/routes.json'));
    const redirects = read('_redirects');
    const retirement = read('cms/migrations/20260930_100000_school_night_retirement.ts');
    const snapshot = read('cms/migration-data/20260930_educators_december_extension_snapshot.ts');

    for (const locationSlug of ['houston', 'manassas', 'mount-prospect', 'orland-park']) {
      expect(fs.existsSync(path.join(root, `src/pages/${locationSlug}/school-night.astro`))).toBe(false);
      expect(routes.routes.some((route) => route.canonicalPath === `/${locationSlug}/school-night`)).toBe(false);
      for (const source of [
        `/${locationSlug}/school-night`,
        `/${locationSlug}/school-night.html`,
        `/${locationSlug}/promos/school-night`,
        `/${locationSlug}/promos/school-night.html`,
      ]) {
        expect(routes.aliases).toContainEqual({ source, target: `/${locationSlug}`, status: 301 });
        expect(redirects).toContain(`${source} /${locationSlug} 301\n`);
      }
      expect(snapshot).toContain(`'/${locationSlug}/school-night'`);
    }
    expect(retirement).toContain('SET "published" = false');
    expect(retirement).toContain('WHERE "link_url" = ${path}');
  });

  it('publishes the educator copy, supplied image, and Klaviyo embed', () => {
    const page = read('src/pages/houston/educators.astro');
    const shell = read('src/components/EducatorPage.astro');
    const template = read('src/components/EducatorOffer.astro');

    expect(page).toContain('formId="YsG3eB"');
    expect(page).toContain('locationName="Houston"');
    expect(page).toContain('locationSlug="houston"');
    expect(shell).toContain('https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=TNQysU');
    expect(shell).toContain('canonicalPath: `/${locationSlug}/educators`');
    expect(shell).toContain('bodyDataLocation={locationSlug}');
    expect(template).toContain('<span>Educators Free</span>');
    expect(template).toContain('<span>Now Through Dec 31</span>');
    expect(template).toContain('now extended through December 31');
    expect(template).toContain('Limit one free educator ticket per purchase.');
    expect(template).toContain('valid through December 31, 2026');
    expect(template).not.toContain('September 30');
    expect(template).not.toContain('School Night');
    expect(template).toContain('Every educator gets a free mission');
    expect(template).toContain('class={`klaviyo-form-${formId}`}');
    expect(template).toContain('data-tm-form-name="educator_appreciation"');
    expect(template).toContain('data-tm-klaviyo-form-id={formId}');
    expect(template).toContain('aria-label="Educator signup form"');
    expect(template).not.toContain('Get your promo code</h2>');
    expect(template).toContain('/assets/photos/promos/houston-educators-control-room-1200.webp');
    expect(template).not.toContain('imagePending');
    expect(template).toContain('Available to K-12 teachers, administrators, and school staff with a valid school ID.');
    expect(template).toContain('Two ticket minimum applies to all bookings');
  });

  it('publishes the matching Philadelphia educator offer with its supplied Klaviyo form', () => {
    const page = read('src/pages/philadelphia/educators.astro');
    const template = read('src/components/EducatorOffer.astro');

    expect(page).toContain('formId="YAhjX2"');
    expect(page).toContain('locationName="Philadelphia"');
    expect(page).toContain('locationSlug="philadelphia"');
    expect(template).toContain('backLink={{ href: `/${locationSlug}`, label: locationName }}');
    expect(template).toContain('Every educator gets a free mission at Time Mission {locationName}');
    expect(template).toContain('Valid at Time Mission {locationName} only.');
  });

  it.each([
    { formId: 'WC5BHF', locationName: 'Nashville', locationSlug: 'nashville' },
    { formId: 'TzbcnW', locationName: 'Dallas', locationSlug: 'dallas' },
    {
      formId: 'TwcrHA',
      locationName: 'Manassas',
      locationSlug: 'manassas',
    },
    {
      formId: 'XmbdNb',
      locationName: 'Mount Prospect',
      locationSlug: 'mount-prospect',
    },
    {
      formId: 'SmY6Us',
      locationName: 'Orland Park',
      locationSlug: 'orland-park',
    },
  ])('publishes the $locationName educator offer with its supplied Klaviyo form', ({
    formId,
    locationName,
    locationSlug,
  }) => {
    const page = read(`src/pages/${locationSlug}/educators.astro`);

    expect(page).toContain(`formId="${formId}"`);
    expect(page).toContain(`locationName="${locationName}"`);
    expect(page).toContain(`locationSlug="${locationSlug}"`);
  });

  it('publishes the Brussels weekday offer and exact SCHOOL20 checkout', () => {
    const page = read('src/pages/brussels/back-to-school-sale.astro');
    const shell = read('src/components/LocationPromotionPage.astro');

    expect(page).toContain('Get 20% OFF missions at Time Mission Brussels on weekdays, Wednesday through Friday.');
    expect(page).toContain('bookingPresentation="direct"');
    expect(page).toContain('promoCode="SCHOOL20"');
    expect(page).toContain('https://ecom.roller.app/TERMINAL1/timemission/nl-BE/products?code=SCHOOL20');
    expect(page).toContain('runThrough="Runs through September 20."');
    expect(shell).toContain("bookingPresentation?: 'direct' | 'roller'");
    expect(shell).toContain("bookingPresentation === 'roller'");
  });

  it('schedules the linked location tickers and restores the standing messages after each sale', () => {
    const brusselsSnapshot = read('cms/migration-data/20260902_brussels_back_to_school_sale_snapshot.ts');
    const usSnapshot = read('cms/migration-data/20260908_school_night_promotions_snapshot.ts');

    for (const locationSlug of ['manassas', 'mount-prospect', 'orland-park']) {
      expect(usSnapshot).toContain(`linkUrl: '/${locationSlug}/school-night'`);
    }
    expect(usSnapshot).toContain("message: '$10 OFF TICKETS – BACK TO SCHOOL'");
    expect(usSnapshot).toContain("locationSlug: 'houston'");
    expect(usSnapshot).toContain("startsAt: '2026-09-07T00:00:00-04:00'");
    expect(brusselsSnapshot).toContain("linkUrl: '/brussels/back-to-school-sale'");
    expect(brusselsSnapshot).toContain("startsAt: '2026-09-02T00:00:00+02:00'");
    expect(brusselsSnapshot).toContain("endsAt: '2026-09-21T00:00:00+02:00'");
  });

  it('keeps the reference layout responsive without exposing implementation placeholders', () => {
    const component = read('src/components/PromoSplit.astro');
    const css = read('css/page-promo.css');

    expect(component).not.toContain('Campaign image placeholder');
    expect(component).not.toContain('imagePending');
    expect(css).not.toContain('.tm-promo-landing__image-status');
    expect(css).not.toContain('.tm-promo-form__heading');
    expect(css).not.toContain('background: rgba(13, 13, 13, 0.62)');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)');
    expect(css).toContain('color: var(--white);');
    expect(css).toContain('.tm-promo-landing__title--educators span');
    expect(css).toContain('white-space: nowrap;');
    expect(css).toContain('.tm-promo-landing__media {\n        order: 1;');
    expect(css).toContain('.tm-promo-landing__content {\n        order: 2;');
  });
});
