import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lazyRuntimeScripts, publicRuntimeScripts, versionedRuntimeSrc } from '../src/lib/public-runtime-contract';

describe('Public runtime contract', () => {
  it('keeps launch-critical script order in one surface', () => {
    const srcs = publicRuntimeScripts.map((script) => script.src);
    const ids = publicRuntimeScripts.map((script) => script.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(srcs).toContain('/js/booking-journey.js');
    expect(srcs).toContain('/js/location-catalog-view.js');
    expect(srcs).toContain('/js/locations.js');
    expect(srcs).toContain('/js/booking-controller.js');
    expect(srcs).toContain('/js/ticket-panel.js');
    expect(srcs.indexOf('/js/booking-journey.js')).toBeLessThan(srcs.indexOf('/js/locations.js'));
    expect(srcs.indexOf('/js/location-catalog-view.js')).toBeLessThan(srcs.indexOf('/js/locations.js'));
    expect(srcs.indexOf('/js/booking-controller.js')).toBeLessThan(srcs.indexOf('/js/ticket-panel.js'));
  });

  it('keeps runtime srcs versioned for cache-safe deploys', () => {
    const bySrc = new Map(publicRuntimeScripts.map((script) => [script.src, script.version]));

    [
      '/js/booking-journey.js',
      '/js/location-catalog-view.js',
      '/js/language-switcher.js',
      '/js/locations.js',
      '/js/nav.js',
      '/js/booking-controller.js',
      '/js/ticket-panel.js',
    ].forEach((src) => {
      expect(bySrc.get(src)).toEqual(expect.any(Number));
      expect(versionedRuntimeSrc({ src, version: bySrc.get(src) || null })).toMatch(/\?v=\d+$/);
    });
    expect(versionedRuntimeSrc({ src: '/js/a11y.js', version: bySrc.get('/js/a11y.js') || null })).toBe('/js/a11y.js');
  });

  it('keeps delayed runtime scripts in the same contract surface', () => {
    const byId = new Map(lazyRuntimeScripts.map((script) => [script.id, script]));

    expect(byId.get('cookieConsent')).toMatchObject({
      trigger: 'consent-ui',
      dependsOn: ['cookieconsent'],
    });
    expect(byId.get('webVitalsRum')).toMatchObject({
      trigger: 'web-vitals',
      dependsOn: ['webVitalsLibrary'],
    });
    const contactFormAnalytics = byId.get('contactFormAnalytics');
    expect(contactFormAnalytics).toMatchObject({ trigger: 'contact-form' });
    expect(contactFormAnalytics && versionedRuntimeSrc(contactFormAnalytics))
      .toBe('/js/contact-form-analytics.js?v=1');
  });

  it('keeps GTM installed high in head and noscript as first body child', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const siteHead = fs.readFileSync(path.join(root, 'src', 'components', 'SiteHead.astro'), 'utf8');
    const siteLayout = fs.readFileSync(path.join(root, 'src', 'layouts', 'SiteLayout.astro'), 'utf8');

    expect(siteHead).toContain("PUBLIC_GTM_CONTAINER_ID || 'GTM-WQPWRNJB'");
    expect(siteHead).toContain('https://www.googletagmanager.com/gtm.js?id=');
    expect(siteHead).not.toContain('https://www.googletagmanager.com/ns.html');
    expect(siteHead.indexOf('https://www.googletagmanager.com/gtm.js?id='))
      .toBeLessThan(siteHead.indexOf('<title>{title}</title>'));

    expect(siteLayout).toContain("PUBLIC_GTM_CONTAINER_ID || 'GTM-WQPWRNJB'");
    expect(siteLayout).toContain('https://www.googletagmanager.com/ns.html?id=');
    expect(siteLayout).toMatch(/<body class=\{bodyClass\} data-location=\{bodyDataLocation\}>\s*<!-- Google Tag Manager \(noscript\) -->/);
  });
});
