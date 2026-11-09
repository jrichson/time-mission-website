import { describe, expect, it, vi } from 'vitest';
import { createBrowserContext, createEventTarget, runScript } from './browser-contract-helpers.mjs';

function carousel(mobile) {
  const frames = [];
  const measure = vi.fn(() => 300);
  const card = { get offsetWidth() { return measure(); } };
  const track = { ...createEventTarget(), style: {}, querySelectorAll: () => [card, card] };
  let enter, exit;
  const browser = createBrowserContext({
    matchMedia: () => ({ matches: mobile }),
    setInterval: vi.fn(() => 1),
    clearInterval: vi.fn(),
    TMPageWidgets: {
      prefersReducedMotion: () => false,
      runWhenVisible(_element, onEnter, onExit) { enter = onEnter; exit = onExit; },
    },
  });
  browser.document.getElementById = (id) => id === 'experiencesScroll' ? track : null;
  browser.context.getComputedStyle = () => ({ gap: '24' });
  browser.context.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  browser.context.cancelAnimationFrame = vi.fn();
  runScript('js/page-widgets-experiences.js', browser.context);
  browser.window.TMPageWidgets.initExperiencesCarousel();
  return { ...browser, frames, measure, track, enter, exit };
}

describe('experience carousel performance', () => {
  it('uses the phone step timer without scheduling idle animation frames', () => {
    const view = carousel(true);
    view.enter();
    view.enter();
    expect(view.window.setInterval).toHaveBeenCalledTimes(1);
    expect(view.frames).toHaveLength(0);
    view.exit();
    expect(view.window.clearInterval).toHaveBeenCalledWith(1);
  });

  it('moves desktop cards without remeasuring layout each frame, then refreshes on resize', () => {
    const view = carousel(false);
    const initialReads = view.measure.mock.calls.length;
    view.enter();
    for (let frame = 0; frame < 5; frame++) view.frames.shift()();
    expect(view.track.style.transform).not.toBe('translateX(0px)');
    expect(view.measure).toHaveBeenCalledTimes(initialReads);
    view.window.dispatchEvent({ type: 'resize' });
    expect(view.measure.mock.calls.length).toBeGreaterThan(initialReads);
  });
});
