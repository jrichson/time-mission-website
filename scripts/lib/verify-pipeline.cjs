'use strict';

const VERIFY_STEPS = [
  ['check', []],
  ['build:astro', []],
  ['check:csp-hashes', []],
  ['check:routes', ['--', '--dist']],
  ['check:links', ['--', '--dist']],
  ['check:astro-dist', []],
  ['check:payload-dist', []],
  ['check:ticket-panel-parity', []],
  ['check:ticket-panel-source-parity', []],
  ['check:seo-output', []],
  ['check:schema-output', []],
  ['check:img-alt-axe', []],
  ['check:hreflang-cluster', []],
  ['check:tap-targets', []],
  ['check:sitemap-output', []],
  ['check:robots-ai', []],
  ['check:llms-txt', []],
  ['check:geo-answer-blocks', []],
  ['check:rsl', []],
  ['check:nap-parity', []],
  ['test:smoke', []],
];

function formatNpmStep(step) {
  const [name, forwarded] = step;
  return ['npm', 'run', name, ...(forwarded || [])].join(' ');
}

module.exports = {
  VERIFY_STEPS,
  formatNpmStep,
};
