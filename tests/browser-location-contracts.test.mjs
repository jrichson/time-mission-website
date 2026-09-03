import { describe, expect, it } from 'vitest';
import {
  createAnchor,
  createBrowserContext,
  runScript,
} from './browser-contract-helpers.mjs';

describe('browser location state contracts', () => {
  it('turns Eindhoven ticket CTAs into Klaviyo signup triggers', async () => {
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
            bookingUrl: '',
            signupFormId: 'Y5LLf7',
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

    expect(signupCta.textContent).toBe('Sign Up');
    expect(signupCta.href).toBe('#');
    expect(signupCta.getAttribute('data-i18n')).toBe('location.signUp');
    expect(signupCta.getAttribute('data-tm-klaviyo-form-trigger')).toBe('Y5LLf7');
    expect(signupCta.hasAttribute('data-tm-booking-trigger')).toBe(false);
  });

  it('opens the requested Klaviyo popup from a signup trigger', () => {
    const appendedScripts = [];
    const trigger = createAnchor('#', {
      attrs: { 'data-tm-klaviyo-form-trigger': 'Y5LLf7' },
      closestSelectors: ['[data-tm-klaviyo-form-trigger]'],
    });
    const { context, window, document } = createBrowserContext();
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
    expect(window._klOnsite).toEqual([['openForm', 'Y5LLf7']]);
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
