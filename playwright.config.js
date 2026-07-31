const { defineConfig, devices } = require('@playwright/test');

const isEuArtifact = process.env.TM_SITE_PROFILE === 'eu';

module.exports = defineConfig({
  testDir: './tests/smoke',
  testMatch: isEuArtifact
    ? ['**/eu-profile.spec.js', '**/csp.spec.js', '**/site-contract.spec.js']
    : '**/*.spec.js',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  // Serves `dist/` via Astro after `npm run build:astro` (VER-03). `npm run verify` builds before tests.
  webServer: {
    command: 'npm run preview:test',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
