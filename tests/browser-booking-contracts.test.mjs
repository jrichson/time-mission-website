import { describe, expect, it } from 'vitest';
import {
  createAnchor,
  createBrowserContext,
  groupTypes,
  locationDoc,
  locationRecords,
  runScript,
} from './browser-contract-helpers.mjs';

describe('browser booking contracts', () => {
  it('LocationContext delegates booking URL decisions to TMBooking after both scripts load', async () => {
    const { context, window } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'manassas',
            slug: 'manassas',
            status: 'open',
            rollerCheckoutUrl: 'https://checkout.example/manassas',
            groupCheckoutUrl: 'https://checkout.example/manassas-groups',
            bookingUrl: 'https://fallback.example/manassas',
            giftCardUrl: 'https://gift.example/manassas',
            groupFormUrls: {
              corporate: 'https://forms.example/manassas-corporate',
              birthdays: 'https://forms.example/manassas-birthdays',
            },
            waiverUrl: 'https://waiver.example/manassas',
          },
          {
            id: 'houston',
            slug: 'houston',
            shortName: 'Houston',
            region: 'us',
            status: 'open',
            address: {
              city: 'Houston',
              state: 'TX',
              country: 'United States',
            },
            bookingUrl: 'https://checkout.example/houston',
            rollerCheckoutUrl: 'https://checkout.example/houston',
            giftCardUrl: '',
            groupFormUrls: {},
          },
          {
            id: 'antwerp',
            slug: 'antwerp',
            shortName: 'Antwerp',
            region: 'europe',
            status: 'open',
            externalUrl: 'https://timemission.eu/antwerp',
            navLabel: 'Belgium – Antwerp',
            bookingUrl: 'https://experience.example/antwerp',
            groupFormUrls: {
              corporate: 'https://experience.example/antwerp-corporate',
            },
          },
          {
            id: 'brussels',
            slug: 'brussels',
            shortName: 'Brussels',
            region: 'europe',
            status: 'open',
            externalUrl: 'https://timemission.eu/brussels',
            navLabel: 'Belgium – Brussels',
            bookingUrl: 'https://timemission.eu/brussels',
            giftCardUrl: '',
            groupFormUrls: {},
          },
          {
            id: 'edison',
            slug: 'edison',
            name: 'Time Mission Edison',
            shortName: 'Edison',
            region: 'us',
            status: 'coming-soon',
            externalUrl: 'https://www.superchargednj.com/',
            navLabel: 'NJ – Edison',
            bookingUrl: '',
            giftCardUrl: '',
            groupFormUrls: {},
          },
          {
            id: 'west-nyack',
            slug: 'west-nyack',
            status: 'open',
            bookingProvider: 'briq',
            bookingUrl: 'https://timemission-palisades.briqbookings.com',
            briqWidget: {
              domain: 'timemission-palisades',
            },
            giftCardUrl: 'https://timemission-palisades.briqbookings.com',
            groupFormUrls: {
              corporate: 'https://timemission-palisades.briqbookings.com',
              'private-events': 'https://timemission-palisades.briqbookings.com',
            },
          },
          {
            id: 'dallas',
            slug: 'dallas',
            status: 'coming-soon',
            bookingUrl: '',
            firstAccessUrl: 'https://time-mission.myklpages.com/l/XDp7DH',
            giftCardUrl: '',
            groupFormUrls: {},
          },
        ],
      },
    });

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    runScript('js/booking-frame.js', context);
    runScript('js/booking-provider-briq.js', context);
    runScript('js/booking-navigation-adapters.js', context);
    runScript('js/booking-controller.js', context);
    await Promise.resolve();
    await Promise.resolve();

    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'manassas' }))
      .toBe('https://checkout.example/manassas');
    expect(window.TMBooking.resolveIntent({ kind: 'tickets', locationId: 'manassas' }))
      .toMatchObject({
        href: 'https://checkout.example/manassas',
        presentation: 'roller',
        usesRollerCheckout: true,
      });
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'manassas' }))
      .toBe('https://checkout.example/manassas');
    expect(window.LocationContext.getOverlayView('manassas').cta)
      .toMatchObject({
        href: '#',
        bookingUrl: 'https://checkout.example/manassas',
        trigger: true,
        externalLocation: false,
      });
    const manassasCta = createAnchor('#');
    window.TMBookingJourney.applyCtaView(manassasCta, window.LocationContext.getOverlayView('manassas').cta);
    expect(manassasCta.getAttribute('data-tm-booking-trigger')).toBe('');
    expect(manassasCta.getAttribute('data-tm-booking-url')).toBe('https://checkout.example/manassas');
    expect(manassasCta.getAttribute('data-tm-location')).toBe('manassas');
    expect(manassasCta.getAttribute('target')).toBeNull();
    expect(manassasCta.getAttribute('rel')).toBeNull();
    expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId: 'manassas' }))
      .toBe('https://gift.example/manassas');
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'manassas',
    })).toBe('https://forms.example/manassas-corporate');
    expect(window.TMBooking.getDestination({
      kind: 'group-tickets',
      locationId: 'manassas',
    })).toBe('https://checkout.example/manassas-groups');
    expect(window.TMBooking.resolveIntent({
      kind: 'group-tickets',
      locationId: 'manassas',
    })).toMatchObject({
      href: 'https://checkout.example/manassas-groups',
      presentation: 'roller',
      usesRollerCheckout: true,
    });
    expect(window.TMBookingJourney.ctaAttributesForIntent(window.TMBooking.resolveIntent({
      kind: 'group-tickets',
      locationId: 'manassas',
    }))).toMatchObject({
      href: '#',
      bookingUrl: 'https://checkout.example/manassas-groups',
      trigger: true,
    });
    const manassasGroupIntent = window.TMBooking.resolveIntent({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'manassas',
    });
    const manassasGroupCta = createAnchor('#');
    window.TMBookingJourney.applyCtaView(
      manassasGroupCta,
      window.TMBookingJourney.ctaAttributesForIntent(manassasGroupIntent),
    );
    expect(manassasGroupCta.getAttribute('target')).toBe('_blank');
    expect(manassasGroupCta.getAttribute('rel')).toBe('noopener');
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'birthdays',
      locationId: 'manassas',
    }))
      .toBe('https://forms.example/manassas-birthdays');
    expect(window.TMBooking.getDestination({ kind: 'waiver', locationId: 'manassas' }))
      .toBe('https://waiver.example/manassas');
    window.TMBooking.navigate({
      source: 'waiver_test',
      href: 'https://waiver.example/manassas',
      kind: 'waiver',
      locationId: 'manassas',
      event: { preventDefault() {} },
    });
    expect(window.openCalls.at(-1)).toEqual({
      features: 'noopener',
      target: '_blank',
      url: 'https://waiver.example/manassas',
    });
    expect(window.location.href).toBe('');
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'houston' }))
      .toBe('https://checkout.example/houston');
    expect(window.TMBooking.getDestination({ kind: 'group-tickets', locationId: 'houston' }))
      .toBe('https://checkout.example/houston');
    expect(window.TMBooking.resolveIntent({ kind: 'group-tickets', locationId: 'houston' }))
      .toMatchObject({
        href: 'https://checkout.example/houston',
        presentation: 'roller',
        usesRollerCheckout: true,
      });
    expect(window.LocationContext.getLocationView('houston'))
      .toMatchObject({
        hoursText: '',
        openingLabel: '',
      });
    expect(window.LocationContext.listTicketOptions().find((opt) => opt.value === 'houston')?.label)
      .toBe('TX – Houston');
    expect(window.LocationContext.listTicketOptions().find((opt) => opt.value === 'antwerp')?.label)
      .toBe('Belgium – Antwerp');
    expect(window.LocationContext.listTicketOptions().find((opt) => opt.value === 'brussels')?.label)
      .toBe('Belgium – Brussels');
    expect(window.TMBooking.getDestination({ kind: 'groups', locationId: 'houston' }))
      .toBe('');
    expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId: 'houston' }))
      .toBe('');
    expect(window.TMBooking.getDestination({ kind: 'waiver', locationId: 'houston' }))
      .toBe('');
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'antwerp' }))
      .toBe('https://experience.example/antwerp');
    expect(window.TMBooking.resolveIntent({ kind: 'tickets', locationId: 'antwerp' }))
      .toMatchObject({
        href: 'https://experience.example/antwerp',
        presentation: 'link',
        externalLocationSite: false,
      });
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'antwerp',
    }))
      .toBe('https://experience.example/antwerp-corporate');
    expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId: 'antwerp' }))
      .toBe('');
    expect(window.LocationContext.getOverlayView('antwerp').cta)
      .toMatchObject({
        href: 'https://timemission.eu/antwerp',
        bookingUrl: '',
        trigger: false,
        externalLocation: true,
      });
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'brussels' }))
      .toBe('https://timemission.eu/brussels');
    expect(window.LocationContext.getOverlayView('brussels').cta)
      .toMatchObject({
        href: 'https://timemission.eu/brussels',
        bookingUrl: '',
        trigger: false,
        externalLocation: true,
      });
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'edison' }))
      .toBe('https://www.superchargednj.com/');
    expect(window.LocationContext.getOverlayView('edison'))
      .toMatchObject({
        bookLabelKey: 'location.visitLocationSite',
        bookLabelFallback: 'Visit Location Site',
        cta: {
          href: 'https://www.superchargednj.com/',
          bookingUrl: '',
          trigger: false,
          externalLocation: true,
        },
      });
    window.localStorage.setItem('tm_location', 'antwerp');
    window.LocationContext.select('antwerp');
    expect(window.LocationContext.getCurrent()?.slug).toBe('antwerp');
    expect(window.LocationContext.getSavedSlug()).toBe('');
    expect(window.localStorage.getItem('tm_location')).toBeNull();
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'west-nyack' }))
      .toBe('#briq-widget-container');
    expect(window.TMBooking.getDestination({ kind: 'group-tickets', locationId: 'west-nyack' }))
      .toBe('#briq-widget-container');
    expect(window.TMBooking.resolveIntent({ kind: 'tickets', locationId: 'west-nyack' }))
      .toMatchObject({
        href: '#briq-widget-container',
        presentation: 'briq-widget',
        usesBriqWidget: true,
      });
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'west-nyack',
    }))
      .toBe('#briq-widget-container');
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'private-events',
      locationId: 'west-nyack',
    }))
      .toBe('#briq-widget-container');
    expect(window.TMBooking.resolveIntent({
      kind: 'groups',
      groupType: 'private-events',
      locationId: 'west-nyack',
    }))
      .toMatchObject({
        href: '#briq-widget-container',
        presentation: 'briq-widget',
        usesBriqWidget: true,
      });
    expect(window.LocationContext.getOverlayView('west-nyack').cta)
      .toMatchObject({
        href: '#',
        bookingUrl: '#briq-widget-container',
        trigger: true,
      });
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'dallas' }))
      .toBe('https://time-mission.myklpages.com/l/XDp7DH');
    expect(window.TMBooking.getDestination({ kind: 'group-tickets', locationId: 'dallas' }))
      .toBe('/contact#location=dallas&type=updates');
    expect(window.TMBooking.getDestination({ kind: 'groups', groupType: 'corporate', locationId: 'dallas' }))
      .toBe('');
    expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId: 'dallas' }))
      .toBe('');
    expect(window.TMBooking.getDestination({ kind: 'waiver', locationId: 'dallas' }))
      .toBe('');
    expect(window.LocationContext.getOverlayView('dallas').cta)
      .toMatchObject({
        href: 'https://time-mission.myklpages.com/l/XDp7DH',
        bookingUrl: '',
        trigger: false,
        target: '_blank',
        rel: 'noopener',
      });
    expect(window.LocationContext.getOverlayView('dallas'))
      .toMatchObject({
        bookLabelKey: 'location.firstAccess',
        bookLabelFallback: 'First Access',
      });
    expect(window.LocationContext.getLocationView('dallas'))
      .toMatchObject({
        bookUrl: 'https://time-mission.myklpages.com/l/XDp7DH',
        bookLabel: 'First Access',
        comingSoon: true,
      });
    expect(window.TMBooking.getDestination({
      kind: 'tickets',
      locationId: 'manassas',
      preferLocationPageFlow: true,
    })).toBe('/manassas?book=1');
  });

  it('booking destinations preserve marketing params on external links and keep Briq local', async () => {
    const { context, window } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'lincoln',
            slug: 'lincoln',
            status: 'open',
            bookingUrl: 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959',
            giftCardUrl: '',
            groupFormUrls: {},
          },
          {
            id: 'west-nyack',
            slug: 'west-nyack',
            status: 'open',
            bookingProvider: 'briq',
            bookingUrl: 'https://timemission-palisades.briqbookings.com',
            briqWidget: { domain: 'timemission-palisades' },
            giftCardUrl: '',
            groupFormUrls: {},
          },
        ],
      },
    });
    window.location.search = '?utm_source=paid&utm_campaign=spring&gclid=abc123&book=1';

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    runScript('js/booking-frame.js', context);
    runScript('js/booking-provider-briq.js', context);
    runScript('js/booking-navigation-adapters.js', context);
    runScript('js/booking-controller.js', context);
    await Promise.resolve();
    await Promise.resolve();

    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'lincoln' }))
      .toBe('https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959&utm_source=paid&utm_campaign=spring&gclid=abc123');
    expect(window.TMBooking.resolveIntent({ kind: 'tickets', locationId: 'lincoln' }))
      .toMatchObject({
        presentation: 'link',
        usesBookingFrame: false,
      });
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'west-nyack' }))
      .toBe('#briq-widget-container');
  });

  it('forces a venue-page reload if multiple Briq widget domains are configured', async () => {
    const { context, window } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'west-nyack',
            slug: 'west-nyack',
            status: 'open',
            bookingProvider: 'briq',
            bookingUrl: 'https://timemission-palisades.briqbookings.com',
            briqWidget: { domain: 'timemission-palisades' },
            groupFormUrls: {},
          },
          {
            id: 'future-briq',
            slug: 'future-briq',
            status: 'open',
            bookingProvider: 'briq',
            bookingUrl: 'https://future-briq.briqbookings.com',
            briqWidget: { domain: 'future-briq' },
            groupFormUrls: {},
          },
        ],
      },
    });

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    runScript('js/booking-frame.js', context);
    runScript('js/booking-provider-briq.js', context);
    runScript('js/booking-navigation-adapters.js', context);
    runScript('js/booking-controller.js', context);
    await Promise.resolve();
    await Promise.resolve();

    window.TMBooking.navigate({
      source: 'test_briq_guard',
      href: '#briq-widget-container',
      kind: 'tickets',
      locationId: 'future-briq',
    });

    expect(window.location.href).toBe('/future-briq?book=1');
  });

  it('runtime group, gift-card, and waiver routing follows location data', async () => {
    const byId = new Map(locationRecords.map((loc) => [loc.id, loc]));
    const { context, window } = createBrowserContext({
      TM_DATA: locationDoc,
    });

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    runScript('js/booking-frame.js', context);
    runScript('js/booking-provider-briq.js', context);
    runScript('js/booking-navigation-adapters.js', context);
    runScript('js/booking-controller.js', context);
    await Promise.resolve();
    await Promise.resolve();

    for (const [locationId, loc] of byId) {
      const slug = loc.slug || loc.id;
      const expectedRuntimeHref = loc.status === 'temporarily-closed'
        ? `/contact#location=${slug}&type=closure`
        : loc.groupCheckoutUrl
        ? loc.groupCheckoutUrl
        : loc.bookingProvider === 'briq'
        ? '#briq-widget-container'
        : loc.externalUrl || loc.rollerCheckoutUrl || loc.bookingUrl || (loc.status === 'coming-soon' ? `/contact#location=${slug}&type=updates` : '');
      const expectedPresentation = expectedRuntimeHref === '#briq-widget-container'
        ? 'briq-widget'
        : loc.externalUrl && expectedRuntimeHref === loc.externalUrl
        ? 'external-site'
        : loc.rollerCheckoutUrl && (expectedRuntimeHref === loc.rollerCheckoutUrl || expectedRuntimeHref === loc.groupCheckoutUrl)
        ? 'roller'
        : (expectedRuntimeHref ? 'link' : 'panel');
      expect(window.TMBooking.getDestination({
        kind: 'group-tickets',
        locationId,
      })).toBe(expectedRuntimeHref);
      expect(window.TMBooking.resolveIntent({
        kind: 'group-tickets',
        locationId,
      })).toMatchObject({
        href: expectedRuntimeHref,
        presentation: expectedPresentation,
      });
    }

    for (const [locationId, loc] of byId) {
      const groupUrls = loc.groupFormUrls || {};
      for (const groupType of groupTypes) {
        const isWestNyackBriq = locationId === 'west-nyack' && !!groupUrls[groupType];
        const expectedRuntimeHref = loc.status === 'temporarily-closed'
          ? `/contact#location=${loc.slug || loc.id}&type=closure`
          : isWestNyackBriq
          ? '#briq-widget-container'
          : (groupUrls[groupType] || '');
        const expectedPresentation = isWestNyackBriq
          ? 'briq-widget'
          : (expectedRuntimeHref ? 'link' : 'panel');
        expect(window.TMBooking.getDestination({
          kind: 'groups',
          groupType,
          locationId,
        })).toBe(expectedRuntimeHref);
        expect(window.TMBooking.resolveIntent({
          kind: 'groups',
          groupType,
          locationId,
        })).toMatchObject({
          href: expectedRuntimeHref,
          presentation: expectedPresentation,
          usesBookingFrame: false,
        });
        if (isWestNyackBriq) {
          expect(window.TMBooking.resolveIntent({
            kind: 'groups',
            groupType,
            locationId,
          })).toMatchObject({
            href: '#briq-widget-container',
            presentation: 'briq-widget',
            usesBriqWidget: true,
          });
        }
      }
    }

    for (const [locationId, loc] of byId) {
      const expected = loc.status === 'temporarily-closed'
        ? `/contact#location=${loc.slug || loc.id}&type=closure`
        : loc.giftCardUrl || '';
      expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId })).toBe(expected);
    }

    for (const [locationId, loc] of byId) {
      const expected = loc.status === 'temporarily-closed'
        ? `/contact#location=${loc.slug || loc.id}&type=closure`
        : loc.waiverUrl || '';
      expect(window.TMBooking.getDestination({ kind: 'waiver', locationId })).toBe(expected);
    }
  });

  it('booking click handler prompts for tickets without a selected location but still navigates non-ticket links', async () => {
    const { context, window } = createBrowserContext();
    runScript('js/booking-journey.js', context);
    runScript('js/booking-frame.js', context);
    runScript('js/booking-provider-briq.js', context);
    runScript('js/booking-navigation-adapters.js', context);
    runScript('js/booking-controller.js', context);

    function makeButton(attrs) {
      let clickHandler = null;
      const values = { ...attrs };
      return {
        className: 'btn-ticket-book',
        getAttribute(name) { return values[name] ?? null; },
        setAttribute(name, value) { values[name] = String(value); },
        removeAttribute(name) { delete values[name]; },
        addEventListener(type, handler) {
          if (type === 'click') clickHandler = handler;
        },
        removeEventListener() {},
        click() {
          clickHandler({
            currentTarget: this,
            preventDefault() {},
          });
        },
      };
    }

    const ticketCta = makeButton({
      href: '#',
      'data-tm-booking-url': 'https://checkout.example/manassas',
      'data-tm-booking-kind': 'tickets',
    });
    let opened = 0;
    window.TMBooking.attach(
      { querySelectorAll: () => [ticketCta] },
      { openPanel: () => { opened += 1; } },
    );
    ticketCta.click();
    expect(window.location.href).toBe('');
    expect(opened).toBe(1);

    const waiverCta = makeButton({
      href: '/waiver',
      'data-tm-booking-kind': 'waiver',
    });
    window.TMBooking.attach(
      { querySelectorAll: () => [waiverCta] },
      { openPanel: () => { opened += 1; } },
    );
    waiverCta.click();
    expect(window.location.href).toBe('/waiver');
    expect(opened).toBe(1);
  });
});
