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

Failure evidence (screenshots, traces, JSON results) is retained in GitHub Actions artifacts for seven days. Only automation sessions with no entered customer data are captured. Review failed checks and report clusters before changing policy; do not automatically allow domains seen in reports. Future candidate policies should be observed in report-only mode and reviewed before enforcement.

## September 28, 2026 recovery

Location-prefixed pages returned 404 when Functions were bypassed: shared routes existed only as runtime rewrites. Both projects had fail-open enabled. US Pages request estimates rose from 12,865 on September 25 to 140,658 on September 26; the aggregate collector stored only 92 reports that day, so those records alone cannot attribute the full request increase to accepted CSP reports. Catch-all invocation made page traffic and discarded reporting traffic share the API quota. The recovery removed public pages and the visitor-report endpoint from Worker routes and generated static copies of 682 US and 372 EU location-prefixed pages. Existing page-specific content is never overwritten.

Recovery deployments: US `5aa1ea3b`, EU `814115c5`. Previously failing nested routes, venue/language state, signup rendering, and browser CSP enforcement were verified live. Contact/newsletter processing and the email endpoint still require Workers availability; static-page recovery does not reset an exhausted account quota. The daily workflow should check nested routes on both regions, not just location homepages.
