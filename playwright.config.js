const { defineConfig, devices } = require('@playwright/test');

const previewPort = Number(process.env.TM_SMOKE_PORT || 4173);
const isEuArtifact = process.env.TM_SITE_PROFILE === 'eu';

module.exports = defineConfig({
  workers: 1,
  testDir: './tests/smoke',
  testMatch: isEuArtifact
    ? ['**/eu-profile.spec.js', '**/csp.spec.js', '**/site-contract.spec.js', '**/navigation-context.spec.js']
    : '**/*.spec.js',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    trace: 'retain-on-failure',
  },
  // Scoped locale URLs need the Pages request handler; Astro serves static-only previews.
  webServer: {
    command: `npx wrangler pages dev dist --port ${previewPort}`,
    url: `http://127.0.0.1:${previewPort}`,
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
