# Provider and CSP monitoring

The daily monitor runs in GitHub Actions independently of ChatGPT and local computers. Its workflow is `.github/workflows/provider-monitor.yml`, at 15:17 UTC daily (08:17 PDT / 07:17 PST). GitHub can delay scheduled runs. New or changed failures and recoveries are emailed to ari@compatible.la. Healthy repeated runs and unchanged incidents stay quiet. One activation confirmation can be requested manually.

## Customer behavior stays unchanged

Public pages are served as static assets, including location-prefixed shared pages. CSP is embedded before executable content in each static HTML document; frame-ancestors remains a response header. Only contact, newsletter, and authenticated monitor-status endpoints invoke Pages Functions. Real-user CSP report uploads are disabled. Synthetic browsers still observe CSP violations without sending reports from customer sessions.

Browser checks run in isolated automation sessions. They load real provider assets and assert visible fields, form styling, Briq product options, Stripe initialization, and Roller checkout content. They do not fill forms, create carts, reserve availability, submit registrations, or pay. Generic smoke tests remain mocked; `npm run test:providers` is a separate US deployment verification gate using local Pages headers. `TM_PROVIDER_BASE_URL=https://www.timemission.com npm run test:providers` runs the production check. EU release checks deliberately skip this US-only registry.

## Diagnostics and privacy

`functions/_shared/provider-monitor.json` documents provider dependencies and the alert recipient. Unit tests detect required origins missing from the existing policy; this file does not generate or loosen CSP. Review it when adding/changing an integration or retiring an educator campaign. Offer expiry alone is not a failed loading check; if a form is intentionally removed, update the registry in the same release.

The legacy CSP collector code and aggregate tables remain for investigation, but `/api/csp-report` is excluded from Worker invocation routes and no reporting headers are emitted. Do not re-enable visitor reporting on the shared Workers quota. Stored historical aggregates contain coarse page groups, directives, origins, counts, and timestamps. The daily monitor purges records older than seven days.

`POST /api/monitor-status` requires the `TM_MONITOR_TOKEN` secret shared by GitHub Actions and Pages. It accepts only bounded test statuses and this repository's run links; email always goes to the configured recipient. It uses the existing Pages `FORM_EMAIL_API_KEY` and `FORM_FROM_EMAIL`, with no credentials in source or results. State changes only after the email API accepts delivery, and run-based idempotency keys reduce duplicate emails. Email API acceptance does not prove inbox delivery. If the reporting/email endpoint is unavailable, the GitHub run fails visibly; GitHub Actions failure notifications are the fallback, according to repository notification settings.

## Setup and operations

1. Apply `migrations/0002_csp_monitoring.sql` to the US `FORM_SUBMISSIONS_DB`.
2. Set the same randomly generated `TM_MONITOR_TOKEN` as a Pages production secret and GitHub Actions repository secret. Never log it.
3. Keep `CSP_REPORTING_ENABLED=false` and the API-only `_routes.json`. Materialize location-prefixed pages at build time and embed the CSP in static HTML; never depend on a Worker for public-page availability.
4. Put the monitoring workflow on the repository default branch (scheduled workflows run there). It does not deploy the site.
5. Dispatch the workflow with `activation=true`, verify the run, and verify email acceptance.

Failure evidence (screenshots, traces, JSON results) is retained in GitHub Actions artifacts for seven days. Only automation sessions with no entered customer data are captured. Review failed checks and report clusters before changing policy; do not automatically allow domains seen in reports. Test candidate policies in isolated browser runs before enforcement. Do not enable per-visitor report uploads on the production site.

## September 28, 2026 recovery

Location-prefixed pages returned 404 when Functions were bypassed: shared routes existed only as runtime rewrites. Both projects had fail-open enabled. US Pages request estimates rose from 12,865 on September 25 to 140,658 on September 26; the aggregate collector stored only 92 reports that day, so those records alone cannot attribute the full request increase to accepted CSP reports. Catch-all invocation made page traffic and discarded reporting traffic share the API quota. The recovery removed public pages and the visitor-report endpoint from Worker routes and generated static copies of 682 US and 372 EU location-prefixed pages. Existing page-specific content is never overwritten.

Recovery deployments: US `5aa1ea3b`, EU `814115c5`. Previously failing nested routes, venue/language state, signup rendering, and browser CSP enforcement were verified live. Contact/newsletter processing and the email endpoint still require Workers availability; static-page recovery does not reset an exhausted account quota. The daily workflow should check nested routes on both regions, not just location homepages.

## Static availability guardrails

The global Functions middleware has been removed. Every public page enforces the full CSP from the first element in its static HTML head; the unsupported-in-meta `frame-ancestors` directive stays in the short static response header. No page calls a monitoring endpoint or fetches a policy at request time. Only `/api/contact`, `/api/newsletter`, and `/api/monitor-status` invoke Functions. Native submissions still require available Worker quota; loading a page, educator form, group enquiry page, or external booking integration does not.

`build:astro` now runs the navigation and CSP artifact gates after generating the final output. The navigation gate resolves actual static files, never Worker rewrites. The CSP gate requires exactly the three explicit API routes, rejects reporting headers, verifies early policy insertion and inline hashes, and checks the static frame-ancestors header. Missing-page and catch-all-route fault injections both failed as expected. This is required source/build behavior, not an optional daily-monitor dependency.

The daily browser suite has 46 desktop/mobile checks: nested US/EU routes, all seven educator forms, Briq/Stripe, Houston Roller checkout, the retired Eindhoven signup redirect, all five US group enquiry forms, and safe GET health checks for contact/newsletter APIs in both regions. No tests send leads or make purchases. Endpoint health does not prove email delivery or newsletter subscription. The expected API health response is 405 with Allow: POST; a quota-related static 404 is an outage, not a successful check. The checks make eight API health requests plus one report per daily run before any retries; visitor page views make zero Worker requests.

Briq fonts are allowed only from its verified widget CDN. Its Sentry envelope endpoint and blob session-replay worker remain blocked as optional telemetry; the browser suite attaches those exact known blocks for inspection and fails on other provider violations. This telemetry exception does not allow blob script execution or add provider domains. The later compatibility release below deliberately permits dynamic script elements used by GTM and payment providers.

September 28 hardening: US `d8296b50`, EU `02c7d439`. A live audit of all 1,462 public HTML URLs returned 200. Both release artifacts passed 659,960 internal link/location combinations; the complete US source build also passed the new gates. The release changed the static policy and removed global middleware, preserving page contents, customer-facing scripts, form actions, and provider destinations. Daily monitoring remains optional and cannot gate visitor responses. Native API quota exhaustion and provider-owned configuration problems must still be reported separately.

## Briq payment iframe regression

On September 28 the exact error `Stripe could not be initialised inside the iframe.` was traced to Briq's `StripeIframeElements` component. It writes a fixed inline `initStripe` function into a same-origin iframe that inherits the site's CSP. Allowing the external Stripe library did not permit this inline initializer. Both desktop and mobile reproduced `window.Stripe` as a function while `initStripe` was undefined.

The first repair permitted the reviewed initializer hash `sha256-rqEXEQY6VZ5G6gK0u63B8caq7WClOFO6MWfMlRFESII=`. The compatibility release supersedes that brittle vendor-code pin: dynamic script elements are permitted, while external script origins remain restricted and inline event handlers stay blocked. The daily `briq-stripe-iframe.spec.cjs` check extracts the current vendor payment-frame template, loads the actual iframe and Stripe library under the deployed policy, and checks initialization and the event-handler boundary. It does not create a cart or payment intent and is not proof of a completed payment.

## Provider compatibility policy

The published GTM container (version 92 at inspection) uses Custom HTML tags with dynamic values and Custom JavaScript variables. Static hashes cannot accommodate those tags. The policy deliberately permits `script-src-elem 'unsafe-inline'` and `script-src 'unsafe-eval'`. This reduces protection against injected script elements; it is an explicit functionality tradeoff, not equivalent to a nonce-based strict CSP. No per-request nonce or Worker is added. The approved existing Google, Meta, TikTok, and Hightouch destinations are listed individually; cloud gateway permissions do not extend to arbitrary AWS or Google Cloud hosts. GTM tags and their payload logic are unchanged.

`script-src-attr 'none'`, reviewed external-script hosts, `object-src 'none'`, `base-uri 'self'`, restricted frames/form destinations, and static `frame-ancestors 'self'` remain enforced. Stripe subdomain and Link frame/connect compatibility is included. Vendor iframe policies remain owned by their providers.

The suite now contains 50 desktop/mobile checks, including Philadelphia/Houston gift-card rendering, US and consented EU tracking plus browser enforcement of blocked inline event handlers and unapproved external scripts. The EU check verifies the existing denied default before granting consent through the existing integration API in its isolated browser only. Required provider CSP violations fail the monitor; no automatic policy expansion occurs. All tests remain free of customer submissions and payments.

The remaining published OpenAI advertising pixel (`bzrcdn.openai.com` script and `bzr.openai.com` event endpoint) and Houston Meta gateway (`fh-118116076e9a4c2a96a99fbb70bea2a0.ecs.us-west-2.on.aws`) were explicitly approved and included in the compatibility policy. Their GTM configuration and event payloads are unchanged.

The Eindhoven signup pages were retired on 2026-10-06 when booking opened. `/eindhoven/signup` and `/nl/eindhoven/signup` redirect to the Eindhoven page. Daily checks assert the redirect, that the hero Book Now button links to the Roller checkout, that no Klaviyo signup trigger remains, and provider CSP. The tracking CSP check now uses `/nl/eindhoven`.
