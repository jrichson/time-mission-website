import { describe, expect, it } from 'vitest';
import {
  createAnchor,
  createBrowserContext,
  runScript,
} from './browser-contract-helpers.mjs';

describe('browser location state contracts', () => {
  it.each([
    ['Tickets', 'nav.tickets', false],
    ['Tickets', 'nav.tickets', true],
    ['Book Your Adventure', 'home.cta.bookAdventure', false],
    ['Book Your Adventure', 'home.cta.bookAdventure', true],
  ])('preserves authored %s copy and icons through hydration and locale changes (%s, span: %s)', async (label, labelKey, textSpan) => {
    function textNode(value) {
      return { nodeType: 3, nodeValue: value, get textContent() { return this.nodeValue; } };
    }
    function markupCta(copy, navOwned = false) {
      const cta = createAnchor('#', {
        className: 'btn-tickets',
        closestSelectors: navOwned ? ['.nav, .mobile-menu, .mobile-book-bar'] : [],
      });
      const svg = { nodeType: 1, tagName: 'SVG', textContent: '' };
      const span = createAnchor('#', { attrs: { 'data-i18n': labelKey }, textContent: copy });
      span.nodeType = 1;
      cta.childNodes = [textSpan && !navOwned ? span : textNode(copy), svg];
      Object.defineProperty(cta, 'children', { get: () => cta.childNodes.filter((child) => child.nodeType === 1) });
      Object.defineProperty(cta, 'textContent', {
        get: () => cta.childNodes.map((child) => child.textContent).join(''),
        set: (value) => { cta.childNodes = [textNode(value)]; },
      });
      return { cta, svg, span };
    }
    const authored = markupCta(label);
    const nav = markupCta('Book Now', true);
    const { context, window, document } = createBrowserContext({
      TM_DATA: { locations: [{ id: 'open', slug: 'open', status: 'open', bookingUrl: 'https://checkout.example/tickets' }] },
      __TM_I18N__: {
        defaultLanguage: 'en',
        languages: [{ code: 'en' }, { code: 'es' }],
        translations: {
          en: { 'nav.bookNow': 'Book Now', [labelKey]: label },
          es: { 'nav.bookNow': 'Reservar ahora', 'nav.tickets': 'Entradas', 'home.cta.bookAdventure': 'Reserva tu aventura' },
        },
      },
    });
    window.location.pathname = '/open';
    document.documentElement = { lang: 'en', dataset: {} };
    document.querySelectorAll = (selector) => {
      if (selector === '.btn-tickets, .btn-book-now') return [authored.cta, nav.cta];
      if (selector === '[data-i18n]') return [authored.cta, nav.cta, ...(authored.cta.children.includes(authored.span) ? [authored.span] : [])]
        .filter((element) => element.hasAttribute('data-i18n'));
      return [];
    };
    runScript('js/language-switcher.js', context);
    await window.TMI18n.ready;
    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    await window.TM.ready;

    expect(authored.cta.textContent.trim()).toBe(label);
    expect(authored.cta.children).toContain(authored.svg);
    window.TMI18n.setLanguage('es');
    const translated = labelKey === 'nav.tickets' ? 'Entradas' : 'Reserva tu aventura';
    expect(authored.cta.children).toContain(authored.svg);
    expect(authored.cta.textContent.trim()).toBe(textSpan ? translated : label);
    expect(nav.cta.textContent.trim()).toBe('Reservar ahora');
    expect(nav.cta.children).toContain(nav.svg);
  });

  it('updates ticket CTA labels and destinations through signup, closure, external and bookable venue changes', async () => {
    const locations = [
      { id: 'signup', slug: 'signup', status: 'coming-soon', signupFormId: 'AbC123' },
      { id: 'closed', slug: 'closed', status: 'temporarily-closed', temporaryClosure: { ctaLabel: 'Get reopening news' } },
      { id: 'external', slug: 'external', status: 'open', externalUrl: 'https://venue.example/', region: 'europe' },
      { id: 'open', slug: 'open', status: 'open', bookingUrl: 'https://checkout.example/tickets' },
      { id: 'signup-link', slug: 'signup-link', status: 'coming-soon', signupUrl: '/signup-link/signup' },
    ];
    const cta = createAnchor('#', {
      className: 'btn-tickets', textContent: 'Book Now', closestSelectors: ['.nav, .mobile-menu, .mobile-book-bar'],
    });
    const { context, window, document } = createBrowserContext({ TM_DATA: { locations } });
    document.querySelectorAll = (selector) => selector === '.btn-tickets, .btn-book-now' ? [cta] : [];
    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    await window.TM.ready;

    window.TM.select('signup');
    expect(cta.textContent).toBe('Sign Up');
    expect(cta.getAttribute('data-tm-klaviyo-form-trigger')).toBe('AbC123');
    window.TM.select('closed');
    expect(cta.textContent).toBe('Get reopening news');
    expect(cta.href).toBe('/contact#location=closed&type=closure');
    expect(cta.hasAttribute('data-tm-booking-trigger')).toBe(false);
    window.TM.select('external');
    expect(cta.textContent).toBe('Visit EU Site');
    expect(cta.href).toBe('https://venue.example/');
    expect(cta.hasAttribute('data-tm-booking-trigger')).toBe(false);
    window.TM.select('open');
    expect(cta.textContent).toBe('Book Now');
    expect(cta.hasAttribute('data-tm-klaviyo-form-trigger')).toBe(false);
    window.TM.select('signup-link');
    expect(cta.textContent).toBe('Ticket Sign-Up');
    expect(cta.href).toBe('/signup-link/signup');
  });

  it.each([
    [{ timeZone: 'America/Chicago' }, { open: '12:00', close: '22:00', label: 'Friday hours' }],
    [{ timeZone: 'Asia/Tokyo' }, { open: '12:00', close: '23:00', label: 'Saturday hours' }],
    [{ timeZone: 'America/Chicago', specialHours: [{ date: '2026-11-06', name: 'Holiday', label: 'Closed' }] }, { label: 'Closed' }],
    [{ timeZone: null }, null],
    [{ timeZone: 'Invalid/Zone' }, null],
    [{ timeZone: 'America/Chicago', status: 'temporarily-closed' }, null],
  ])('uses the venue calendar and special hours, or suppresses unknown hours: %j', async (overrides, expected) => {
    const location = {
      id: 'venue', slug: 'venue', status: 'open',
      hours: { fri: { open: '12:00', close: '22:00', label: 'Friday hours' }, sat: { open: '12:00', close: '23:00', label: 'Saturday hours' } },
      ...overrides,
    };
    const { context, window } = createBrowserContext({ TM_DATA: { locations: [location] } });
    context.Date = class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-07T01:30:00Z'])); } };
    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    await window.TM.ready;
    window.TM.current = location;
    expect(window.TM.getTodayHours()).toEqual(expected);
    expect(window.TM.isOpenNow()).toBe(expected?.open ? overrides.timeZone === 'America/Chicago' : null);
  });

  it('shows explicit opening labels and translates the generic coming-soon label', () => {
    const { context, window } = createBrowserContext({
      TMI18n: { text: (key, fallback) => key === 'location.comingSoon' ? 'Binnenkort' : fallback },
    });
    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);

    const location = { slug: 'boston', status: 'coming-soon', openingLabel: 'Opening November 20' };
    expect(window.TMLocationViews.statusLabelForLocation(location)).toBe('Opening November 20');
    expect(window.TMLocationViews.statusLabelForLocation({ ...location, openingLabel: '' }))
      .toBe('Binnenkort');
  });

  it.each(['nl', 'fr', 'es'])('restores the venue from a %s shared-page URL', async (locale) => {
    const { context, window } = createBrowserContext({
      __TM_SITE_PROFILE__: { localizedRoutes: true, locales: ['en', 'nl', 'fr', 'es'] },
      TM_DATA: { locations: [{ id: 'eindhoven', slug: 'eindhoven', name: 'Eindhoven', hours: {} }] },
    });
    window.location.pathname = `/${locale}/eindhoven/faq`;
    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    await window.TM.ready;
    expect(window.TM.current?.slug).toBe('eindhoven');
  });

  it.each(['', 'https://ecom.roller.app/timemissioneindhoven/onlinecheckout/en/home'])('resolves Eindhoven ticket CTAs with checkout %s', async (bookingUrl) => {
    const signupCta = createAnchor('/contact#location=eindhoven&type=updates', {
      className: 'btn-tickets',
      textContent: 'Contact Us',
    });
    const { context, window, document } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'eindhoven',
            slug: 'eindhoven',
            name: 'Time Mission Eindhoven',
            shortName: 'Eindhoven',
            status: 'coming-soon',
            bookingUrl,
            // Signup-only locations still render the Klaviyo trigger; bookable ones do not.
            signupFormId: bookingUrl ? '' : 'W5S6At',
            contact: { phone: '+31 (0)40 808 3636', email: 'eindhoven@timemission.nl' },
            hours: {},
          },
        ],
      },
    });
    window.location.pathname = '/eindhoven';
    document.body.dataset.location = 'eindhoven';
    document.querySelectorAll = (selector) => (
      selector === '.btn-tickets, .btn-book-now' ? [signupCta] : []
    );

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    await window.TM.ready;

    if (bookingUrl) {
      expect(signupCta.href).toBe(bookingUrl);
      expect(signupCta.hasAttribute('data-tm-klaviyo-form-trigger')).toBe(false);
      expect(signupCta.hasAttribute('data-tm-booking-trigger')).toBe(false);
      return;
    }
    expect(signupCta.textContent).toBe('Sign Up');
    expect(signupCta.href).toBe('#');
    expect(signupCta.getAttribute('data-i18n')).toBe('location.signUp');
    expect(signupCta.getAttribute('data-tm-klaviyo-form-trigger')).toBe('W5S6At');
    expect(signupCta.hasAttribute('data-tm-booking-trigger')).toBe(false);
  });

  it('opens a location signup form through the Klaviyo popup trigger', () => {
    const appendedScripts = [];
    const trigger = createAnchor('#', {
      attrs: { 'data-tm-klaviyo-form-trigger': 'AbC123' },
      closestSelectors: ['[data-tm-klaviyo-form-trigger]'],
    });
    const { context, window, document } = createBrowserContext();
    window.location.pathname = '/dallas';
    document.head = {
      appendChild(script) {
        appendedScripts.push(script);
        return script;
      },
    };

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    const click = {
      type: 'click',
      target: trigger,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    document.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(window._klOnsite).toEqual([['openForm', 'AbC123']]);
    expect(appendedScripts).toHaveLength(1);
    expect(appendedScripts[0]).toMatchObject({
      async: true,
      src: 'https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=TNQysU',
    });
  });

  it('homepage clears stale saved location instead of restoring it on hard refresh', async () => {
    const { context, window } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'philadelphia',
            slug: 'philadelphia',
            name: 'Time Mission Philadelphia',
            shortName: 'Philadelphia',
            status: 'open',
            bookingUrl: 'https://book.philadelphia.timemission.com',
            rollerCheckoutUrl: 'https://book.philadelphia.timemission.com',
            groupFormUrls: {},
          },
        ],
      },
    });
    window.location.pathname = '/';
    window.localStorage.setItem('tm_location', 'philadelphia');
    window.localStorage.setItem('timeMissionLocation', 'Philadelphia');

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    await window.TM.ready;

    expect(window.TM.current).toBeNull();
    expect(window.LocationContext.getCurrent()).toBeNull();
    expect(window.LocationContext.getSavedSlug()).toBe('');
    expect(window.localStorage.getItem('tm_location')).toBeNull();
    expect(window.localStorage.getItem('timeMissionLocation')).toBeNull();
  });

  it('location-prefixed shared pages select the location from the URL', async () => {
    const { context, window } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'mount-prospect',
            slug: 'mount-prospect',
            name: 'Time Mission Mount Prospect',
            shortName: 'Mount Prospect',
            status: 'open',
            bookingUrl: 'https://book.mountprospect.timemission.com',
            rollerCheckoutUrl: 'https://book.mountprospect.timemission.com',
            groupFormUrls: {},
          },
        ],
      },
    });
    window.location.pathname = '/mount-prospect/about';
    window.localStorage.setItem('tm_location', 'philadelphia');

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    await window.TM.ready;

    expect(window.TM.current?.id).toBe('mount-prospect');
    expect(window.localStorage.getItem('tm_location')).toBeNull();
  });
});
