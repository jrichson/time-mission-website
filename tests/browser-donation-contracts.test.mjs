import { describe, expect, it } from 'vitest';
import {
  createBrowserContext,
  runScript,
} from './browser-contract-helpers.mjs';

function element(attrs = {}) {
  const attributes = new Map(Object.entries(attrs));
  const classes = new Set();
  const listeners = new Map();
  const el = {
    hidden: false,
    textContent: '',
    onerror: null,
    onload: null,
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    dispatch(type) {
      if (type === 'load' && typeof this.onload === 'function') this.onload({ type });
      if (type === 'error' && typeof this.onerror === 'function') this.onerror({ type });
      const listener = listeners.get(type);
      if (listener) listener.call(this, { type });
    },
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
    removeAttribute(name) { attributes.delete(name); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
  };
  return el;
}

describe('browser donation contracts', () => {
  it('embeds the selected location donation form when available', () => {
    const button = element({ href: '#', 'aria-disabled': 'true' });
    button.classList.add('is-disabled');
    const hint = element();
    const formSection = element();
    const frame = element();
    const intro = element();
    const url = 'https://forms.roller.app/#/timemissionmountprospect/953cef02271145c/form';
    const { context, window, document } = createBrowserContext({
      TM: {
        current: {
          id: 'mount-prospect',
          slug: 'mount-prospect',
          shortName: 'Mount Prospect',
          donationUrl: url,
        },
      },
    });

    document.querySelectorAll = (selector) => (
      selector === '.btn-donation, [data-donation="1"]' ? [button] : []
    );
    document.querySelector = (selector) => (
      selector === '[data-donation-form-section]' ? formSection : null
    );
    document.getElementById = (id) => ({
      donationLocationHint: hint,
      donationRequestFrame: frame,
      donationFormIntro: intro,
    }[id] || null);

    runScript('js/page-donation-after.js', context);
    frame.dispatch('load');

    expect(button.getAttribute('href')).toBe(url);
    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(button.classList.contains('is-disabled')).toBe(false);
    expect(button.textContent).toBe('Open Donation Request Form');
    expect(button.hidden).toBe(true);
    expect(formSection.hidden).toBe(false);
    expect(frame.getAttribute('src')).toBe(url);
    expect(frame.getAttribute('title')).toBe('Donation request form for Mount Prospect');
    expect(hint.textContent).toContain('Mount Prospect');
    expect(intro.textContent).toContain('Mount Prospect');
    expect(window.openCalls).toEqual([]);
  });

  it('reveals the direct form button only when the iframe has a loading issue', () => {
    const button = element({ href: '#', 'aria-disabled': 'true' });
    const hint = element();
    const formSection = element();
    const frame = element();
    const url = 'https://forms.roller.app/#/timemissionmountprospect/953cef02271145c/form';
    const { context, document } = createBrowserContext({
      TM: {
        current: {
          id: 'mount-prospect',
          slug: 'mount-prospect',
          shortName: 'Mount Prospect',
          donationUrl: url,
        },
      },
    });

    document.querySelectorAll = (selector) => (
      selector === '.btn-donation, [data-donation="1"]' ? [button] : []
    );
    document.querySelector = (selector) => (
      selector === '[data-donation-form-section]' ? formSection : null
    );
    document.getElementById = (id) => ({
      donationLocationHint: hint,
      donationRequestFrame: frame,
      donationFormIntro: element(),
    }[id] || null);

    runScript('js/page-donation-after.js', context);
    expect(button.hidden).toBe(true);

    frame.dispatch('error');

    expect(button.hidden).toBe(false);
    expect(button.getAttribute('href')).toBe(url);
    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(hint.textContent).toContain('not loading');
  });

  it('keeps the donation form unavailable for unsupported locations', () => {
    const button = element({ href: 'https://forms.roller.app/#/old/form' });
    const hint = element();
    const formSection = element();
    const frame = element({ src: 'https://forms.roller.app/#/old/form' });
    const { context, document } = createBrowserContext({
      TM: {
        current: {
          id: 'houston',
          slug: 'houston',
          shortName: 'Houston',
        },
      },
    });

    document.querySelectorAll = (selector) => (
      selector === '.btn-donation, [data-donation="1"]' ? [button] : []
    );
    document.querySelector = (selector) => (
      selector === '[data-donation-form-section]' ? formSection : null
    );
    document.getElementById = (id) => ({
      donationLocationHint: hint,
      donationRequestFrame: frame,
      donationFormIntro: element(),
    }[id] || null);

    runScript('js/page-donation-after.js', context);

    expect(button.getAttribute('href')).toBe('#');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.classList.contains('is-disabled')).toBe(true);
    expect(button.hidden).toBe(false);
    expect(formSection.hidden).toBe(true);
    expect(frame.getAttribute('src')).toBeNull();
    expect(hint.textContent).toContain('not ready for Houston');
  });

  it('only reveals the footer donation link for donation-enabled locations', async () => {
    const donationLink = element();
    donationLink.hidden = true;
    const { context, window, document } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'mount-prospect',
            slug: 'mount-prospect',
            shortName: 'Mount Prospect',
            status: 'open',
            bookingUrl: 'https://book.mountprospect.timemission.com',
            donationUrl: 'https://forms.roller.app/#/timemissionmountprospect/953cef02271145c/form',
            groupFormUrls: {},
          },
          {
            id: 'houston',
            slug: 'houston',
            shortName: 'Houston',
            status: 'open',
            bookingUrl: 'https://book.houston.timemission.com',
            groupFormUrls: {},
          },
        ],
      },
    });
    window.location.pathname = '/mount-prospect/donation';
    document.querySelectorAll = (selector) => (
      selector === '[data-tm-donation-link]' ? [donationLink] : []
    );

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    await window.TM.ready;

    expect(window.TM.current?.id).toBe('mount-prospect');
    expect(donationLink.hidden).toBe(false);

    window.TM.select('houston');

    expect(donationLink.hidden).toBe(true);
  });
});
