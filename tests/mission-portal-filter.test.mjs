import { describe, expect, it } from 'vitest';

import { runScript } from './browser-contract-helpers.mjs';

function classList(initial = []) {
  const classes = new Set(initial);
  return {
    add(name) { classes.add(name); },
    contains(name) { return classes.has(name); },
    remove(name) { classes.delete(name); },
    toggle(name, force) {
      if (force) classes.add(name);
      else classes.delete(name);
    },
  };
}

function tab(filter, active = false) {
  const count = { textContent: '' };
  return {
    classList: classList(active ? ['active'] : []),
    dataset: { filter },
    onClick: null,
    querySelector(selector) { return selector === '.filter-count' ? count : null; },
    addEventListener(type, handler) {
      if (type === 'click') this.onClick = handler;
    },
    count,
  };
}

function card(missionId, category) {
  return {
    classList: classList(['reveal']),
    dataset: { category, missionId },
    style: {},
    addEventListener() {},
  };
}

function runMissionFilter(hiddenMissionIds) {
  const tabs = [tab('all', true), tab('skill'), tab('mental')];
  const cards = [
    card('1005', 'skill'),
    card('1017', 'physical skill'),
    card('1013', 'mental speed'),
  ];
  const emptyState = { style: {} };
  let onChange = null;
  const document = {
    querySelector(selector) {
      if (selector === '.portals-empty') return emptyState;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.filter-tab') return tabs;
      if (selector === '.portal-card') return cards;
      if (selector === '.reveal') return cards;
      return [];
    },
  };
  const window = {
    document,
    setTimeout(handler) { handler(); },
    TM: {
      current: { hiddenMissionIds },
      ready: Promise.resolve(),
      onChange(handler) { onChange = handler; },
    },
  };

  runScript('js/page-missions-after.js', {
    Array,
    document,
    window,
  });

  return { cards, emptyState, onChange, tabs, window };
}

describe('missions portal location filter', () => {
  it('hides selected-location missions and recalculates filter counts', () => {
    const { cards, emptyState, tabs, window, onChange } = runMissionFilter(['1005']);

    expect(cards[0].style.display).toBe('none');
    expect(cards[1].style.display).toBe('');
    expect(cards[2].style.display).toBe('');
    expect(tabs[0].count.textContent).toBe('2');
    expect(tabs[1].count.textContent).toBe('1');
    expect(emptyState.style.display).toBe('none');

    tabs[1].onClick();
    expect(cards[0].style.display).toBe('none');
    expect(cards[1].style.display).toBe('');
    expect(cards[2].style.display).toBe('none');

    window.TM.current = { hiddenMissionIds: [] };
    onChange();
    expect(cards[0].style.display).toBe('');
    expect(tabs[0].count.textContent).toBe('3');
  });
});
