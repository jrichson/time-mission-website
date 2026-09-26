# Provider and CSP monitoring

The daily monitor runs in GitHub Actions independently of ChatGPT and local computers. Its workflow is `.github/workflows/provider-monitor.yml`, at 15:17 UTC daily (08:17 PDT / 07:17 PST). GitHub can delay scheduled runs. New or changed failures and recoveries are emailed to ari@compatible.la. Healthy repeated runs and unchanged incidents stay quiet. One activation confirmation can be requested manually.

## Customer behavior stays unchanged

No customer JavaScript, CSS, content, forms, booking links, or enforced CSP is changed by this monitoring implementation. The middleware adds a `Content-Security-Policy-Report-Only` copy of the enforced policy plus reporting endpoints, only when `CSP_REPORTING_ENABLED=true`. Report-only headers observe violations; they do not block resources. The collector and email endpoints return JSON/empty responses and are not customer-facing pages.

Browser checks run in isolated automation sessions. They load real provider assets and assert visible fields, form styling, Briq product options, Stripe initialization, and Roller checkout content. They do not fill forms, create carts, reserve availability, submit registrations, or pay. Generic smoke tests remain mocked; `npm run test:providers` is a separate US deployment verification gate using local Pages headers. `TM_PROVIDER_BASE_URL=https://www.timemission.com npm run test:providers` runs the production check. EU release checks deliberately skip this US-only registry.

## Diagnostics and privacy

`functions/_shared/provider-monitor.json` documents provider dependencies and the alert recipient. Unit tests detect required origins missing from the existing policy; this file does not generate or loosen CSP. Review it when adding/changing an integration or retiring an educator campaign. Offer expiry alone is not a failed loading check; if a form is intentionally removed, update the registry in the same release.

`POST /api/csp-report` accepts standard legacy and Reporting API payloads, at most 16 KiB and 20 reports per request. It rejects foreign document origins and discards extension noise. Stored data contains only a coarse page group, directive, blocked origin, provider, count, and timestamps—no full URLs, query strings, fragments, script samples, IPs, user agents, or form fields. Storage is capped at 200 aggregate keys per UTC day. The authenticated daily monitor purges data older than seven days. Repeated documented-provider/site violations (at least three reports in the last day) join synthetic failures in alert emails. Other-origin diagnostics remain stored for investigation but do not generate email noise automatically.

`POST /api/monitor-status` requires the `TM_MONITOR_TOKEN` secret shared by GitHub Actions and Pages. It accepts only bounded test statuses and this repository's run links; email always goes to the configured recipient. It uses the existing Pages `FORM_EMAIL_API_KEY` and `FORM_FROM_EMAIL`, with no credentials in source or results. State changes only after the email API accepts delivery, and run-based idempotency keys reduce duplicate emails. Email API acceptance does not prove inbox delivery. If the reporting/email endpoint is unavailable, the GitHub run fails visibly; GitHub Actions failure notifications are the fallback, according to repository notification settings.

## Setup and operations

1. Apply `migrations/0002_csp_monitoring.sql` to the US `FORM_SUBMISSIONS_DB`.
2. Set the same randomly generated `TM_MONITOR_TOKEN` as a Pages production secret and GitHub Actions repository secret. Never log it.
3. Deploy the reporting backend with `CSP_REPORTING_ENABLED=true`; preserve the existing static artifact and enforced CSP.
4. Put the monitoring workflow on the repository default branch (scheduled workflows run there). It does not deploy the site.
5. Dispatch the workflow with `activation=true`, verify the run, and verify email acceptance.

Failure evidence (screenshots, traces, JSON results) is retained in GitHub Actions artifacts for seven days. Only automation sessions with no entered customer data are captured. Review failed checks and report clusters before changing policy; do not automatically allow domains seen in reports. Future candidate policies should be observed in report-only mode and reviewed before enforcement.
