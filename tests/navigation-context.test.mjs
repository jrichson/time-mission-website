import { describe, it, expect } from 'vitest';
import { createBrowserContext, createAnchor, runScript } from './browser-contract-helpers.mjs';
import { resolveSiteProfile } from '../config/site-profiles.mjs';
import { getPublicSiteContract } from '../src/lib/site-contract';

function setup(profileId, locale, location = profileId === 'eu' ? 'eindhoven' : 'mount-prospect', path = '/faq') {
  const profile = resolveSiteProfile({ TM_SITE_PROFILE: profileId });
  const contract = getPublicSiteContract();
  contract.externalLocationIds = profileId === 'eu' ? ['houston', 'mount-prospect'] : ['eindhoven', 'brussels', 'antwerp'];
  const browser = createBrowserContext({
    __TM_SITE_PROFILE__: { ...profile, counterpartLocales: resolveSiteProfile({ TM_SITE_PROFILE: profileId === 'eu' ? 'us' : 'eu' }).locales },
    __TM_SITE_CONTRACT__: contract,
  });
  const prefix = locale === 'en' ? '' : `/${locale}`;
  Object.assign(browser.window.location, { origin: profile.origin, pathname: `${prefix}/${location}${path}`, href: `${profile.origin}${prefix}/${location}${path}` });
  browser.window.location.replace = url => { browser.window.replaced = url; };
  runScript('js/navigation-context.js', browser.context);
  return { ...browser, nav: browser.window.TMNavigation, prefix, location };
}

describe('regional navigation context', () => {
  for (const profileId of ['us', 'eu']) {
    const profile = resolveSiteProfile({ TM_SITE_PROFILE: profileId });
    for (const locale of profile.locales) {
      it(`${profileId}/${locale}: preserves context for every shared route and dynamic page family`, () => {
        const { nav, window, prefix, location } = setup(profileId, locale);
        const paths = window.__TM_SITE_CONTRACT__.runtime.locationScopedPaths.filter(path => !nav.pathLocation(path));
        for (const path of [...paths, '/blog/nashville-announcement', '/c/sample-campaign']) {
          const expected = `${prefix}/${location}${path === '/' ? '' : path}?utm_source=test#details`;
          expect(nav.href(`${path}?utm_source=test#details`), path).toBe(expected);
          expect(nav.href(expected), `idempotent ${path}`).toBe(expected);
        }
        expect(nav.href('/adult-birthday-parties')).toBe(`${prefix}/${location}/groups/birthdays`);
        expect(nav.href('/faq.html')).toBe(`${prefix}/${location}/faq`);
      });
      it(`${profileId}/${locale}: preserves explicit venues, forms, and provider URLs`, () => {
        const { nav, prefix, window } = setup(profileId, locale);
        for (const path of ['/brussels/back-to-school-sale', '/groups/inquire/houston/default', '/group-form-thank-you/houston/default']) {
          const external = window.__TM_SITE_CONTRACT__.externalLocationIds.includes(nav.pathLocation(path));
          const remotePrefix = locale === 'es' ? '/es' : '';
          expect(nav.href(path)).toBe(external ? profile.counterpartOrigin + remotePrefix + path : prefix + path);
        }
        for (const path of ['https://forms.roller.app/#/venue/form', 'https://example.org/checkout?x=1', '/api/contact', '/assets/map.pdf', '#booking', 'mailto:hello@example.com']) {
          expect(nav.href(path)).toBe(path);
        }
      });
    }
  }

  it('keeps US languages limited to English and Spanish across region switches', () => {
    const spanish = setup('eu', 'es').nav;
    expect(spanish.href('https://www.timemission.com/houston?utm_source=eu#booking')).toBe('https://www.timemission.com/es/houston?utm_source=eu#booking');
    expect(spanish.href('https://www.timemission.com/about')).toBe('https://www.timemission.com/es/about');
    expect(spanish.href('https://www.timemission.com/')).toBe('https://www.timemission.com/es');
    expect(setup('eu', 'nl').nav.href('https://www.timemission.com/houston')).toBe('https://www.timemission.com/houston');
    expect(setup('eu', 'fr').nav.href('https://www.timemission.com/houston')).toBe('https://www.timemission.com/houston');
    expect(setup('us', 'es').nav.href('https://www.timemission.eu/eindhoven')).toBe('https://www.timemission.eu/es/eindhoven');
  });

  it('uses an explicit contact venue instead of the previous selection', () => {
    const { nav } = setup('eu', 'nl');
    expect(nav.href('/contact#location=brussels&type=groups')).toBe('/nl/brussels/contact#location=brussels&type=groups');
    expect(nav.href('/contact#location=invalid&type=groups')).toBe('/nl/eindhoven/contact#location=invalid&type=groups');
  });

  it('updates reused and replaced links after the venue changes without duplicating prefixes', () => {
    const { nav, window } = setup('eu', 'nl');
    const link = createAnchor('/blog/nashville-announcement');
    nav.rewriteLink(link);
    expect(link.getAttribute('href')).toBe('/nl/eindhoven/blog/nashville-announcement');
    window.TM = { current: { slug: 'brussels' } };
    nav.rewriteLink(link);
    expect(link.getAttribute('href')).toBe('/nl/brussels/blog/nashville-announcement');
    link.setAttribute('href', '/contact');
    nav.rewriteLink(link);
    expect(link.getAttribute('href')).toBe('/nl/brussels/contact');
  });

  it('keeps booking intent and actual navigation on the same contextual URL', () => {
    const { context, window, nav } = setup('eu', 'nl');
    runScript('js/booking-journey.js', context);
    runScript('js/booking-navigation-adapters.js', context);
    const loc = { id: 'eindhoven', slug: 'eindhoven', status: 'coming-soon' };
    const intent = window.TMBookingJourney.resolveIntent({ location: loc, kind: 'tickets' });
    expect(intent.href).toBe('/nl/eindhoven/contact#location=eindhoven&type=updates');
    expect(nav.href('/nl/eindhoven/blog/nashville-announcement', { locale: 'fr' })).toBe('/fr/eindhoven/blog/nashville-announcement');
  });
});
