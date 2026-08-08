import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import locationsDocument from '../data/locations.json';
import {
  isInternalLocation,
  localizedPath,
  publicLocationForProfile,
  resolveSiteProfile,
} from '../config/site-profiles.mjs';
import { renderEuWranglerConfig } from '../scripts/lib/eu-wrangler-config.mjs';
import { orderedLocationRegions } from '../src/lib/location-list';
import { ticketPanelSelectOptions } from '../src/lib/ticket-options';
import geoAnswerBlocks from '../src/data/site/geo-answer-blocks.json';

const root = fileURLToPath(new URL('..', import.meta.url));

function location(slug) {
  return locationsDocument.locations.find((item) => item.slug === slug);
}

describe('site deployment profiles', () => {
  it('defaults to the existing US deployment', () => {
    const profile = resolveSiteProfile({});

    expect(profile).toMatchObject({
      id: 'us',
      origin: 'https://www.timemission.com',
      internalRegion: 'us',
      locales: ['en', 'es'],
      localizedRoutes: false,
      pagesProject: 'time-mission-website',
    });
    expect(localizedPath('/antwerp', 'es', profile)).toBe('/antwerp');
  });

  it('uses locale-prefixed routes for the EU deployment', () => {
    const profile = resolveSiteProfile({ TM_SITE_PROFILE: 'eu' });

    expect(profile).toMatchObject({
      id: 'eu',
      origin: 'https://www.timemission.eu',
      internalRegion: 'europe',
      locales: ['en', 'nl', 'fr', 'es'],
      localizedRoutes: true,
      pagesProject: 'time-mission-website-eu',
    });
    expect(localizedPath('/', 'nl', profile)).toBe('/nl');
    expect(localizedPath('/antwerp/', 'fr', profile)).toBe('/fr/antwerp');
    expect(localizedPath('/antwerp', 'en', profile)).toBe('/antwerp');
  });

  it('orders the active region first in location navigation', () => {
    expect(orderedLocationRegions('us')).toEqual(['us', 'europe']);
    expect(orderedLocationRegions('europe')).toEqual(['europe', 'us']);

    const options = ticketPanelSelectOptions(
      [location('houston'), location('eindhoven'), location('antwerp')],
      'europe',
    );
    expect(options.map((option) => option.value)).toEqual(['antwerp', 'eindhoven', 'houston']);
  });

  it('keeps EU answer blocks focused on European venue facts', () => {
    expect(geoAnswerBlocks.profiles.eu.locations.text).toContain('Eindhoven is coming soon');
    expect(geoAnswerBlocks.profiles.eu.locations.text).toContain('Hermanus Boexstraat 4');
    expect(geoAnswerBlocks.profiles.eu.pricing.text).toContain('current euro prices');
    expect(geoAnswerBlocks.profiles.eu.pricing.text).not.toContain('Military');
  });

  it('keeps only regional locations operational on each site', () => {
    const us = resolveSiteProfile({ TM_SITE_PROFILE: 'us' });
    const eu = resolveSiteProfile({ TM_SITE_PROFILE: 'eu' });
    const houston = location('houston');
    const antwerp = location('antwerp');

    expect(isInternalLocation(houston, us)).toBe(true);
    expect(isInternalLocation(antwerp, eu)).toBe(true);

    expect(publicLocationForProfile(antwerp, us)).toMatchObject({
      pagePath: undefined,
      externalUrl: 'https://www.timemission.eu/antwerp',
      bookingUrl: '',
      groupFormUrls: undefined,
    });
    expect(publicLocationForProfile(houston, eu)).toMatchObject({
      pagePath: undefined,
      externalUrl: 'https://www.timemission.com/houston',
      bookingUrl: '',
      groupFormUrls: undefined,
      giftCardUrl: '',
    });
    expect(publicLocationForProfile(antwerp, eu)).toMatchObject({
      pagePath: '/antwerp',
      bookingUrl: expect.stringContaining('experience-factory.com'),
    });
  });

  it('keeps Brussels on its local page with the verified Roller checkout', () => {
    const eu = resolveSiteProfile({ TM_SITE_PROFILE: 'eu' });
    const brussels = publicLocationForProfile(location('brussels'), eu);

    expect(brussels.pagePath).toBe('/brussels');
    expect(brussels.bookingUrl).toBe('https://ecom.roller.app/terminal1/timemission/nl/products');
    expect(brussels.rollerCheckoutUrl).toBe('https://ecom.roller.app/terminal1/timemission/nl/products');
    expect(brussels.bookingProvider).toBe('roller');
    expect(brussels.externalUrl).toBeUndefined();
  });

  it('publishes verified European venue facts without making Eindhoven bookable', () => {
    const antwerp = location('antwerp');
    const brussels = location('brussels');
    const eindhoven = location('eindhoven');

    expect(antwerp).toMatchObject({
      currency: 'EUR',
      locale: 'nl-BE',
      timeZone: 'Europe/Brussels',
    });
    expect(antwerp.hours).toMatchObject({
      mon: { open: '16:00', close: '22:00', label: '16:00 - 22:00' },
      fri: { open: '16:00', close: '00:00', label: '16:00 - 00:00' },
      sat: { open: '11:00', close: '00:00', label: '11:00 - 00:00' },
    });
    expect(brussels).toMatchObject({
      alternateName: 'Time Mission Brussels at Terminal 1',
      venueName: 'Terminal 1',
      contact: { phone: '', email: 'brussels@timemission.com' },
      geo: { latitude: 50.898211, longitude: 4.3342982 },
      localBusinessSchemaEligible: true,
    });
    expect(eindhoven).toMatchObject({
      status: 'coming-soon',
      address: {
        line1: 'Hermanus Boexstraat 4',
        city: 'Eindhoven',
        zip: '5611 PJ',
        country: 'Netherlands',
      },
      bookingUrl: '',
      contact: { phone: '', email: 'eindhoven@timemission.nl' },
      currency: 'EUR',
      locale: 'nl-NL',
      timeZone: 'Europe/Amsterdam',
    });
    expect(antwerp.contact.email).toBe('antwerp@experience-factory.com');
  });

  it('preserves a third-party venue link for an internal location', () => {
    const us = resolveSiteProfile({ TM_SITE_PROFILE: 'us' });
    const edison = publicLocationForProfile(location('edison'), us);

    expect(edison.pagePath).toBe('/edison');
    expect(edison.externalUrl).toBe('https://www.superchargednj.com/');
  });

  it('renders the EU Pages config with its isolated D1 binding', () => {
    const config = renderEuWranglerConfig(root, {
      EU_D1_DATABASE_ID: '123e4567-e89b-12d3-a456-426614174000',
      EU_TURNSTILE_SITE_KEY: 'eu-test-site-key',
    });

    expect(config).toContain('name = "time-mission-website-eu"');
    expect(config).toContain('binding = "FORM_SUBMISSIONS_DB"');
    expect(config).toContain('database_name = "time-mission-forms-eu"');
    expect(config).toContain('database_id = "123e4567-e89b-12d3-a456-426614174000"');
    expect(config).toContain('migrations_dir = "migrations"');
    expect(config).toContain('FORM_ALLOWED_ORIGINS = "https://www.timemission.eu,https://timemission.eu"');
    expect(config).toContain('PUBLIC_TURNSTILE_SITE_KEY = "eu-test-site-key"');
    expect(config).toContain('CONTACT_TO_EMAIL_ANTWERP = "antwerp@experience-factory.com"');
    expect(config).toContain('CONTACT_TO_EMAIL_BRUSSELS = "brussels@timemission.com"');
    expect(config).toContain('CONTACT_TO_EMAIL_EINDHOVEN = "eindhoven@timemission.nl"');
  });

  it('refuses to render an EU Pages config without an EU D1 UUID', () => {
    expect(() => renderEuWranglerConfig(root, {
      EU_TURNSTILE_SITE_KEY: 'eu-test-site-key',
    })).toThrow(/EU_D1_DATABASE_ID/);
  });
});
