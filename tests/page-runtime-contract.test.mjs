import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pageWidgetRuntimeFiles = [
  'js/page-widgets-shared.js',
  'js/page-widgets-hero-video.js',
  'js/page-widgets-tagline.js',
  'js/page-widgets-counters.js',
  'js/page-widgets-experiences.js',
  'js/page-widgets-content.js',
  'js/page-widgets-effects.js',
  'js/page-widgets.js',
];
const runtime = pageWidgetRuntimeFiles
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

function createTaglineElement() {
  return {
    classList: {
      add() {},
      remove() {},
    },
    textContent: '',
  };
}

function runRuntime(pageInit) {
  class EmptyIntersectionObserver {
    observe() {}
    disconnect() {}
  }
  const elements = new Map([['taglineText', createTaglineElement()]]);
  const document = {
    readyState: 'loading',
    addEventListener() {},
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  const window = {
    __TM_PAGE_INIT__: pageInit,
    addEventListener() {},
    clearInterval,
    clearTimeout,
    document,
    IntersectionObserver: EmptyIntersectionObserver,
    matchMedia(query) {
      return { matches: String(query).includes('prefers-reduced-motion') };
    },
    navigator: {},
    setInterval,
    setTimeout,
  };
  const context = {
    clearInterval,
    clearTimeout,
    document,
    IntersectionObserver: EmptyIntersectionObserver,
    navigator: window.navigator,
    setInterval,
    setTimeout,
    window,
  };

  vm.runInNewContext(runtime, context, { filename: 'page-widgets-runtime' });
  return elements;
}

describe('page-widgets runtime contract', () => {
  it('auto-initializes city pages from page init data', () => {
    const elements = runRuntime({
      mode: 'city',
      config: { city: 'Philadelphia', taglines: ['City Tagline'] },
    });

    expect(elements.get('taglineText').textContent).toBe('Time Mission Philadelphia');
  });

  it('auto-initializes index pages from page init data', () => {
    const elements = runRuntime({
      mode: 'index',
      config: { taglines: ['Index Tagline'] },
    });

    expect(elements.get('taglineText').textContent).toBe('Index Tagline');
  });

  it('uses canonical clean URLs for runtime navigation', () => {
    expect(runtime).not.toContain('missions.html');
    expect(runtime).toContain("window.location.href = '/missions'");
  });

  it('keeps the coordinator small and leaves widget behavior in focused files', () => {
    const coordinator = fs.readFileSync(path.join(root, 'js/page-widgets.js'), 'utf8');
    expect(coordinator.split('\n').length).toBeLessThanOrEqual(120);
    for (const file of pageWidgetRuntimeFiles) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }
  });
});
