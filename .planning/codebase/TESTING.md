# Testing Patterns

**Analysis Date:** 2026-04-29

## Test Framework

**Runner:**
- Playwright Test 1.59.1
- Config: `playwright.config.js`
- Tests directory: `tests/smoke`
- Current test file: `tests/smoke/site.spec.js`
- Browser project: Chromium desktop through `devices['Desktop Chrome']` in `playwright.config.js`
- Static server: `python3 -m http.server 4173` launched by Playwright `webServer` in `playwright.config.js`

**Assertion Library:**
- Playwright `expect` from `@playwright/test`
- Use locator assertions such as `toHaveTitle()`, `toContainText()`, `toBeVisible()`, `toHaveClass()`, `toHaveAccessibleName()`, `toHaveCount()`, `toHaveAttribute()`, and `expect.poll()`.

**Run Commands:**
```bash
npm run test              # Run Playwright smoke tests
npm run test:smoke        # Run Playwright smoke tests directly
npm run check             # Run all Node validation checks
npm run verify            # Run all validation checks and smoke tests
npx playwright test       # Equivalent underlying Playwright command
```

## Test File Organization

**Location:**
- E2E/smoke tests live under `tests/smoke/`.
- Repository validation scripts live under `scripts/`.
- There are no colocated unit tests next to `js/`, `css/`, or HTML pages.
- There is no separate fixture directory. Tests use live static files from the project root served by `python3 -m http.server`.

**Naming:**
- Use `*.spec.js` for Playwright test files. Current example: `tests/smoke/site.spec.js`.
- Use `check-*.js` for Node validation scripts. Current examples: `scripts/check-location-contracts.js`, `scripts/check-sitemap.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, `scripts/check-internal-links.js`.

**Structure:**
```text
tests/
└── smoke/
    └── site.spec.js        # Browser smoke tests for key user flows

scripts/
├── check-accessibility-baseline.js
├── check-booking-architecture.js
├── check-components.js
├── check-internal-links.js
├── check-location-contracts.js
└── check-sitemap.js
```

## Test Structure

**Suite Organization:**
```javascript
const { test, expect } = require('@playwright/test');

test('homepage loads core navigation and booking panel', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Time Mission/i);
  await expect(page.locator('.hero-title')).toContainText(/STEP INTO THE/i);

  await page.locator('.hero-cta .btn-tickets').click();
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
});
```

**Patterns:**
- Use one top-level `test()` per user-visible behavior. `tests/smoke/site.spec.js` covers homepage load and booking panel, ticket option hydration, location persistence, FAQ keyboard accessibility, and contact form configuration.
- Start each browser test with `await page.goto(...)` against a public route (`/`, `/faq.html`, `/contact.html`).
- Prefer user interactions over implementation calls: `.click()`, `.selectOption()`, `.press('Enter')`, and `page.waitForURL()`.
- Assert visible DOM outcomes and accessibility attributes, not internal variables. Examples: `#ticketPanel` has class `active`, `#ticketClose` has an accessible name, `.faq-question` has `aria-expanded`.
- Use `expect.poll()` only when reading browser-side asynchronous state such as `localStorage` in `tests/smoke/site.spec.js`.
- Use stable selectors already present in markup: IDs (`#ticketPanel`, `#ticketLocation`, `#ticketBookBtn`, `#locationBtn`), semantic form classes (`form.contact-form`), and accessibility attributes.

## Mocking

**Framework:** Not used

**Patterns:**
```javascript
test('ticket panel options hydrate from location data', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero-cta .btn-tickets').click();

  const options = page.locator('#ticketLocation option');
  await expect(options).toHaveCount(10);
});
```

**What to Mock:**
- No mocking pattern exists. Keep smoke tests close to production behavior by serving the repo root and letting browser scripts fetch `data/locations.json`.
- Add mocking only when an external network dependency makes a test nondeterministic. Current tests avoid external booking calls by checking `href` values and form attributes instead of navigating off-site.

**What NOT to Mock:**
- Do not mock `data/locations.json` for the existing ticket/location smoke paths. `tests/smoke/site.spec.js` intentionally verifies that `js/locations.js`, `data/locations.json`, `js/ticket-panel.js`, and page markup work together.
- Do not mock DOM APIs for browser behavior that Playwright can exercise directly.
- Do not replace the static server with application-specific bootstrapping unless the deployment model changes. `playwright.config.js` currently validates the static site as served from disk.

## Fixtures and Factories

**Test Data:**
```javascript
await page.locator('#ticketLocation').selectOption('orland-park');
await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', 'orland-park.html?book=1');

await page.locator('#ticketLocation').selectOption('manassas');
await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', 'manassas.html?book=1');
```

**Location:**
- Static data fixtures are production data files. `data/locations.json` is used by browser runtime and validation scripts.
- HTML pages and component markup are the test fixture surface. `index.html`, `faq.html`, `contact.html`, location pages such as `philadelphia.html`, and `components/ticket-panel.html` define the DOM contracts under test.
- No factory helpers exist. If tests grow, create small local helpers in `tests/smoke/site.spec.js` before adding a test utility layer.

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# Not configured
```

- There is no Istanbul, nyc, c8, Jest coverage, Vitest coverage, or Playwright coverage report configured.
- Quality coverage is currently contractual rather than percentage-based: `npm run check` validates static structure and `npm run test:smoke` validates critical browser flows.
- Playwright traces are retained on failure through `trace: 'retain-on-failure'` in `playwright.config.js`.

## Test Types

**Unit Tests:**
- Not used. There is no unit test framework configured.
- Small deterministic rules are expressed as Node validation scripts instead of unit tests. Examples: `scripts/check-location-contracts.js` validates location data shape, `scripts/check-booking-architecture.js` validates booking source-of-truth constraints, and `scripts/check-sitemap.js` validates sitemap entries.

**Integration Tests:**
- Node validation scripts act as static integration tests across files:
- `scripts/check-location-contracts.js` reads `data/locations.json` and verifies corresponding `*.html` pages exist.
- `scripts/check-sitemap.js` compares root HTML pages, `groups/*.html`, `locations/`, and `sitemap.xml`.
- `scripts/check-components.js` checks runtime HTML pages for ticket panel markup and close-button accessibility.
- `scripts/check-booking-architecture.js` checks that `js/ticket-panel.js` and `js/roller-checkout.js` use `window.TM` and `location.rollerCheckoutUrl` instead of hardcoded booking maps.
- `scripts/check-accessibility-baseline.js` checks that runtime HTML pages load `js/a11y.js` and preserve labeled close controls.
- `scripts/check-internal-links.js` scans `href` and `src` attributes in HTML and verifies local targets exist.

**E2E Tests:**
- Playwright smoke tests in `tests/smoke/site.spec.js` exercise the site in Chromium against `http://127.0.0.1:4173`.
- Current E2E coverage includes homepage rendering, booking panel open behavior, hydrated ticket location options, canonical location persistence, FAQ keyboard interaction, and contact form submission configuration.
- Add new user-facing tests to `tests/smoke/site.spec.js` when a change affects navigation, booking, forms, accessibility behavior, or cross-page location state.

## Common Patterns

**Async Testing:**
```javascript
test('location selection persists canonical slug', async ({ page }) => {
  await page.goto('/');

  await page.locator('#locationBtn').click();
  await page.locator('#locationDropdown a[data-city="Philadelphia"]').click();

  await page.waitForURL(/philadelphia\.html$/);
  await expect(page.locator('#locationText')).toContainText('Philadelphia');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBe('philadelphia');
});
```

- Use Playwright auto-waiting locator assertions before adding manual waits.
- Use `page.waitForURL()` for navigation triggered by user actions.
- Use `expect.poll()` for state that changes inside the browser and is not directly represented by a locator.
- Avoid sleeping in tests.

**Error Testing:**
```javascript
if (errors.length) {
  console.error('Location contract check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
```

- Validation scripts test failures by building an `errors` array and exiting nonzero.
- New validation checks should prefer collecting all errors before exiting so one run gives a complete fix list.
- Playwright tests do not currently include negative-path tests. Add negative-path coverage only for shipped behavior that must fail gracefully, such as missing data fallbacks or inaccessible controls.

## Validation Scripts

**Location contracts:**
- Command: `npm run check:locations`
- File: `scripts/check-location-contracts.js`
- Validates: `data/locations.json` has required strings, unique IDs, matching `id`/`slug`, existing page files, booking URL presence for open locations, absence of booking URLs for coming-soon locations, and HTTPS Roller checkout URLs.

**Sitemap:**
- Command: `npm run check:sitemap`
- File: `scripts/check-sitemap.js`
- Validates: root `*.html` pages, `groups/*.html`, and `locations/` are represented in `sitemap.xml`, excluding `404.html` and `contact-thank-you.html`.

**Components:**
- Command: `npm run check:components`
- File: `scripts/check-components.js`
- Validates: runtime pages that load ticket panel behavior include `#ticketPanel`, `#ticketClose` has `aria-label="Close ticket panel"`, and pages loading `js/ticket-panel.js` include the `<!-- Ticket Popup Panel -->` marker.

**Booking architecture:**
- Command: `npm run check:booking`
- File: `scripts/check-booking-architecture.js`
- Validates: `js/ticket-panel.js` does not define hardcoded `bookingUrls` or `locationPages`, `js/roller-checkout.js` does not define hardcoded `rollerCheckouts`, `js/ticket-panel.js` waits for `window.TM.ready`, and `js/roller-checkout.js` resolves `loc.rollerCheckoutUrl`.

**Accessibility baseline:**
- Command: `npm run check:a11y`
- File: `scripts/check-accessibility-baseline.js`
- Validates: runtime HTML pages load `js/a11y.js`, ticket panels have labeled close controls, and location dialogs have labeled close controls.

**Internal links:**
- Command: `npm run check:links`
- File: `scripts/check-internal-links.js`
- Validates: local `href` and `src` targets exist after stripping query strings and hashes, while ignoring external schemes, hash-only anchors, protocol-relative URLs, and data URLs.

---

*Testing analysis: 2026-04-29*
