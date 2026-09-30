const { defineConfig, devices } = require('@playwright/test');
const baseURL = process.env.TM_PROVIDER_BASE_URL || 'http://127.0.0.1:4189';
module.exports = defineConfig({
  testDir: './tests/providers',
  timeout: 60000,
  expect: { timeout: 25000 },
  workers: 2,
  retries: 1,
  reporter: [['line'], ['json', { outputFile: 'test-results/providers/results.json' }]],
  outputDir: 'test-results/providers/artifacts',
  use: { baseURL, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: process.env.TM_PROVIDER_BASE_URL ? undefined : {
    command: 'npx wrangler pages dev dist --port 4189', url: baseURL,
    reuseExistingServer: !process.env.CI, timeout: 120000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
