import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { getPublicSiteContract } from '../src/lib/site-contract.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const locationDoc = JSON.parse(fs.readFileSync(path.join(root, 'data', 'locations.json'), 'utf8'));
const locationRecords = locationDoc.locations || [];
const groupTypes = [
  'birthdays',
  'corporate',
  'field-trips',
  'bachelor-ette',
  'private-events',
  'holidays',
];

function readScript(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      const arr = listeners.get(type) || [];
      arr.push(listener);
      listeners.set(type, arr);
    },
    removeEventListener(type, listener) {
      const arr = listeners.get(type) || [];
      listeners.set(type, arr.filter((fn) => fn !== listener));
    },
    dispatchEvent(event) {
      const arr = listeners.get(event.type) || [];
      for (const listener of arr) listener.call(this, event);
      return true;
    },
  };
}

function createCustomEvent(type, init = {}) {
  return { type, detail: init.detail };
}

function createBrowserContext(extraWindow = {}) {
  const local = new Map();
  const document = {
    ...createEventTarget(),
    readyState: 'complete',
    body: { dataset: {}, style: {} },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        style: {},
        dataset: {},
        children: [],
        setAttribute(name, value) { this[name] = value; },
        appendChild(child) { this.children.push(child); return child; },
        addEventListener() {},
      };
    },
    createElementNS(_namespace, tag) {
      return this.createElement(tag);
    },
    createTextNode(text) { return { textContent: text }; },
    dispatchEvent: createEventTarget().dispatchEvent,
  };
  Object.assign(document, createEventTarget());

  const window = {
    ...createEventTarget(),
    document,
    console,
    CustomEvent: createCustomEvent,
    location: {
      pathname: '/',
      search: '',
      href: '',
      assign(url) { this.href = url; },
    },
    openCalls: [],
    open(url, target, features) {
      this.openCalls.push({ features, target, url });
      return { opener: null };
    },
    history: { replaceState() {} },
    matchMedia() { return { matches: false }; },
    navigator: {
      language: 'en-US',
      languages: ['en-US'],
    },
    requestAnimationFrame(cb) { cb(); },
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem(key) { return local.has(key) ? local.get(key) : null; },
      setItem(key, value) { local.set(key, String(value)); },
      removeItem(key) { local.delete(key); },
    },
    sessionStorage: {
      getItem() { return null; },
      setItem() {},
    },
    dataLayer: [],
    __TM_SITE_CONTRACT__: getPublicSiteContract(),
    ...extraWindow,
  };

  const context = {
    window,
    document,
    console,
    CustomEvent: createCustomEvent,
    setTimeout,
    clearTimeout,
    Promise,
    Date,
    URL,
    URLSearchParams,
    navigator: window.navigator,
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
  };
  return { context, window, document };
}

function runScript(rel, context) {
  vm.runInNewContext(readScript(rel), context, { filename: rel });
}

function createAnchor(href, options = {}) {
  const attrs = new Map(Object.entries(options.attrs || {}));
  attrs.set('href', href);
  const classes = new Set(String(options.className || '').split(/\s+/).filter(Boolean));
  const closestSelectors = new Set(options.closestSelectors || []);
  return {
    dataset: options.dataset || {},
    style: {},
    href,
    textContent: options.textContent || '',
    classList: {
      contains(name) {
        return classes.has(name);
      },
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null;
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
      if (name === 'href') this.href = String(value);
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
    hasAttribute(name) {
      return attrs.has(name);
    },
    closest(selector) {
      return closestSelectors.has(selector) ? this : null;
    },
    addEventListener() {},
  };
}

export {
  createAnchor,
  createBrowserContext,
  createCustomEvent,
  createEventTarget,
  groupTypes,
  locationDoc,
  locationRecords,
  readScript,
  root,
  runScript,
};
