'use strict';

const VERIFY_STEPS = [
  ['check', []],
  ['build:astro', []],
  ['check:csp-hashes', []],
  ['check:best-practices', ['--', '--dist']],
  ['check:routes', ['--', '--dist']],
  ['check:links', ['--', '--dist']],
  ['check:astro-dist', []],
  ['check:analytics-output', []],
  ['check:css-bundles', []],
  ['check:payload-dist', []],
  ['check:ticket-panel-parity', []],
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

const VERIFY_SUCCESS_MESSAGE = 'verify-site-output.mjs: all steps passed.';

function resolveNpmStep(step, platform = process.platform) {
  const [name, forwarded] = step;
  return {
    command: platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', name, ...(forwarded || [])],
  };
}

function formatNpmStep(step) {
  const resolved = resolveNpmStep(step, 'posix');
  return [resolved.command, ...resolved.args].join(' ');
}

module.exports = {
  VERIFY_STEPS,
  VERIFY_SUCCESS_MESSAGE,
  formatNpmStep,
  resolveNpmStep,
};
