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
  it('keeps the corrected School Night offer and coded checkout destination', () => {
    const page = read('src/pages/houston/school-night.astro');

    expect(page).toContain('Get $10 off 90 and 120 minute missions');
    expect(page).toContain('Valid on 90 and 120 minute sessions only. 60 minute sessions excluded.');
    expect(page).toContain('Not valid Labor Day weekend, September 5 through September 7.');
    expect(page).toContain('https://ecom.roller.app/TimeMissionHouston/onlinecheckout/en-US/products?code=SCHOOLNIGHT');
    expect(page).toContain('href={bookingUrl}');
    expect(page).not.toContain('data-tm-booking-trigger');
    expect(page).not.toContain('data-tm-booking-presentation="roller"');
    expect(page).not.toContain('data-tm-booking-url={bookingUrl}');
    expect(page).toContain('data-tm-promo-cta="school_night_book_now"');
    expect(page).toContain('/js/page-houston-promo-after.js?v=2');
    expect(page).not.toContain('imagePending');
    expect(page).not.toContain('up to $15 off');
    expect(page).not.toContain('60 minutes is $29.95');
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
    expect(template).toContain('<span>Through Sept 30</span>');
    expect(template).toContain('Every educator gets a free mission');
    expect(template).toContain('class={`klaviyo-form-${formId}`}');
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
