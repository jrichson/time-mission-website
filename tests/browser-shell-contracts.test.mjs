import { describe, expect, it } from 'vitest';
import { createAnchor, createBrowserContext, createEventTarget, runScript } from './browser-contract-helpers.mjs';

function element(document, attrs = {}) {
  const node = { ...createAnchor('#', { attrs }), ...createEventTarget(), hidden: false, children: [], offsetParent: {} };
  node.classList.toggle = (name, force) => {
    const enabled = force ?? !node.classList.contains(name);
    if (enabled) node.classList.add(name);
    else node.classList.remove(name);
    return enabled;
  };
  node.focus = () => { document.activeElement = node; };
  node.querySelector = () => null;
  node.querySelectorAll = () => [];
  node.contains = (target) => target === node || node.children.includes(target);
  node.appendChild = (child) => {
    node.children = node.children.filter((item) => item !== child);
    node.children.push(child);
    child.parentElement = node;
    return child;
  };
  node.insertBefore = (child, anchor) => {
    if (child === anchor) return child;
    node.children = node.children.filter((item) => item !== child);
    const index = node.children.indexOf(anchor);
    node.children.splice(index < 0 ? node.children.length : index, 0, child);
    child.parentElement = node;
    return child;
  };
  node.remove = () => {
    if (node.parentElement) node.parentElement.children = node.parentElement.children.filter((child) => child !== node);
  };
  return node;
}

function shell({ selected = null, geolocation = true, savedPosition = true, todayHours = null } = {}) {
  let request = null;
  const selections = [];
  const venues = [
    { id: 'far', slug: 'far', shortName: 'Far', geo: { latitude: 45, longitude: -80 } },
    { id: 'near', slug: 'near', shortName: 'Near', geo: { latitude: 40, longitude: -75 } },
  ];
  const { context, window, document } = createBrowserContext({
    isSecureContext: true,
    matchMedia: () => ({ matches: true }),
    navigator: { geolocation: geolocation ? { getCurrentPosition(success, failure, options) { request = { success, failure, options }; } } : undefined },
    TM: { current: selected, locations: venues, get: (slug) => venues.find((venue) => venue.slug === slug), select: (...args) => selections.push(args), getTodayHours: () => todayHours },
  });
  context.requestAnimationFrame = window.requestAnimationFrame;
  document.createElement = () => element(document);
  const ids = Object.fromEntries(['nav', 'mobileMenu', 'locationBtn', 'locationDropdown', 'locationSearch', 'utilityLocationName', 'utilityHours'].map((id) => [id, element(document)]));
  const menuButton = element(document, { 'aria-expanded': 'false' });
  const firstMenuLink = element(document);
  const lastMenuLink = element(document);
  const closeButton = element(document);
  const geoButton = element(document);
  const geoStatus = element(document);
  const mega = element(document);
  const megaTrigger = element(document);
  const megaPanel = element(document);
  const megaLink = element(document);
  mega.children = [megaTrigger, megaPanel, megaLink];
  mega.querySelector = (selector) => selector === 'a' ? megaTrigger : megaPanel;
  megaPanel.querySelector = () => megaLink;
  const group = element(document);
  const body = element(document);
  body.appendChild(group);
  const links = venues.map((venue) => {
    const link = element(document);
    link.dataset = { city: venue.shortName, tmLocationSlug: venue.slug };
    link.setAttribute('href', '/' + venue.slug);
    link.closest = () => link;
    group.appendChild(link);
    return link;
  });
  group.querySelectorAll = () => group.children;
  group.querySelector = () => group.children[0];
  ids.locationDropdown.children = [closeButton, geoButton, ...links];
  ids.locationDropdown.querySelectorAll = (selector) => selector === '.location-group' ? [group] : selector === 'a' ? links : [closeButton, geoButton, ...links];
  ids.locationDropdown.querySelector = (selector) => ({ '.location-dropdown-close': closeButton, '[data-location-use-mine]': geoButton, '[data-location-geo-status]': geoStatus }[selector] || null);
  ids.mobileMenu.children = [firstMenuLink, lastMenuLink];
  ids.mobileMenu.querySelectorAll = () => [firstMenuLink, lastMenuLink];
  document.querySelector = (selector) => selector === '.nav-menu-btn' ? menuButton : null;
  document.querySelectorAll = (selector) => selector === '.has-mega' ? [mega] : [];
  document.getElementById = (id) => ids[id] || null;
  if (savedPosition) window.localStorage.setItem('tm_geo_position', JSON.stringify({ lat: 30, lng: 50, savedAt: Date.now() }));
  runScript('js/nav.js', context);
  const click = (node) => node.dispatchEvent({ type: 'click', stopPropagation() {}, preventDefault() {} });
  return { ...ids, context, window, document, menuButton, firstMenuLink, lastMenuLink, closeButton, geoButton, geoStatus, group, mega, megaTrigger, megaLink, selections, request: () => request, click };
}

describe('shared shell interactions', () => {
  it.each([true, false])('opens the venue picker without requesting location or retaining precise coordinates (previously saved: %s)', (savedPosition) => {
    const view = shell({ savedPosition });
    view.click(view.locationBtn);
    expect(view.locationDropdown.classList.contains('open')).toBe(true);
    expect(view.request()).toBeNull();
    expect(view.window.localStorage.getItem('tm_geo_position')).toBeNull();
  });

  it.each([null, { id: 'far', slug: 'far' }])('sorts nearby venues only on request, preserving selection %j', (selected) => {
    const view = shell({ selected });
    view.click(view.geoButton);
    expect(view.request()).not.toBeNull();
    view.request().success({ coords: { latitude: 40, longitude: -75 } });
    expect(view.group.children[0].dataset.tmLocationSlug).toBe('near');
    expect(view.selections).toEqual([]);
    expect(view.window.TM.current).toBe(selected);
    expect(view.window.localStorage.getItem('tm_geo_position')).toBeNull();
    expect(view.window.dataLayer).toEqual([]);
  });

  it.each([1, 2, 3])('keeps manual choices usable after geolocation error %s', (code) => {
    const view = shell();
    view.click(view.geoButton);
    view.request().failure({ code });
    expect(view.geoStatus.hidden).toBe(false);
    expect(view.geoStatus.textContent).not.toBe('');
    const choice = view.group.children[0];
    view.locationDropdown.dispatchEvent({ type: 'click', target: choice, button: 0, preventDefault() {}, stopPropagation() {} });
    expect(view.selections[0][0]).toBe('far');
  });

  it('keeps the picker usable when geolocation is unsupported', () => {
    const view = shell({ geolocation: false });
    view.click(view.locationBtn);
    expect(view.locationDropdown.classList.contains('open')).toBe(true);
    expect(view.geoButton.hidden).toBe(true);
  });

  it('opens, traps and returns keyboard focus for the mobile menu', () => {
    const view = shell();
    view.menuButton.focus();
    view.click(view.menuButton);
    expect(view.menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(view.document.activeElement).toBe(view.firstMenuLink);
    view.lastMenuLink.focus();
    let prevented = false;
    view.mobileMenu.dispatchEvent({ type: 'keydown', key: 'Tab', preventDefault() { prevented = true; } });
    expect(prevented).toBe(true);
    expect(view.document.activeElement).toBe(view.firstMenuLink);
    view.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    expect(view.mobileMenu.classList.contains('open')).toBe(false);
    expect(view.menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(view.document.activeElement).toBe(view.menuButton);
    expect(view.document.body.style.overflow).toBe('');
  });

  it('returns focus to the venue-picker opener on Escape', () => {
    const view = shell();
    view.locationBtn.focus();
    view.click(view.locationBtn);
    expect(view.document.activeElement).toBe(view.closeButton);
    view.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    expect(view.locationDropdown.classList.contains('open')).toBe(false);
    expect(view.document.activeElement).toBe(view.locationBtn);
  });

  it('supports keyboard entry and Escape dismissal for desktop navigation panels', () => {
    const view = shell();
    view.megaTrigger.focus();
    view.mega.dispatchEvent({ type: 'focusin' });
    expect(view.megaTrigger.getAttribute('aria-expanded')).toBe('true');
    view.mega.dispatchEvent({ type: 'keydown', key: 'ArrowDown', target: view.megaTrigger, preventDefault() {} });
    expect(view.document.activeElement).toBe(view.megaLink);
    view.mega.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {} });
    expect(view.document.activeElement).toBe(view.megaTrigger);
    expect(view.megaTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(view.mega.classList.contains('is-dismissed')).toBe(true);
  });

  it.each([
    [{ id: 'far', shortName: 'Far', status: 'open' }, null, '', true],
    [{ id: 'far', shortName: 'Far', status: 'open' }, { label: 'Closed' }, 'Closed', false],
    [{ id: 'far', shortName: 'Far', status: 'temporarily-closed', temporaryClosure: { label: 'Closed for repairs' } }, null, 'Closed for repairs', false],
  ])('shows authoritative hours and closure labels without inventing an open claim: %j', (selected, todayHours, expected, hidden) => {
    const view = shell({ selected, todayHours });
    view.document.dispatchEvent({ type: 'tm:location-changed', detail: selected });
    expect(view.utilityHours.textContent).toBe(expected);
    expect(view.utilityHours.hidden).toBe(hidden);
  });
});
