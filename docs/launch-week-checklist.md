# Time Mission Launch Week Checklist

Target window: week of Monday, May 18, 2026.

Goal: launch the new Astro public site on Cloudflare Pages at `https://timemission.com` without avoidable SEO loss, booking disruption, form failure, or analytics blind spots.

This checklist is intentionally operational. Work top to bottom, assign an owner for every unchecked item, and do not cut over until the required gates are complete or explicitly accepted.

## Current Snapshot

- [x] Repo branch is `rebuild`; launch-week fixes are currently local and not yet committed/pushed.
- [x] Full local launch gate passed on May 18, 2026: `npm run verify`.
- [x] Final local production build passed on May 18, 2026: `npm run build:astro` plus CSP hash check.
- [x] Rollback tag exists locally: `pre-astro-migration-baseline`.
- [x] New site has generated `sitemap.xml`, `robots.txt`, `llms.txt`, `_headers`, `_redirects`, and Cloudflare Pages Functions.
- [ ] Current production site is still live at `timemission.com`; developer call indicates domain/DNS may involve SiteGround while hosting is split across the current US/EU infrastructure, so confirm the exact DNS and rollback owner before cutover.
- [ ] Cloudflare production custom domain is not yet cut over.
- [ ] Cloudflare Pages preview has not yet been manually signed off with production-like env vars/secrets.
- [ ] Google Search Console URL inventory has not yet been reconciled against `_redirects`.
- [ ] `npm audit` still needs a network-enabled run; local sandbox DNS could not reach `registry.npmjs.org`.
- [x] Launch decision: keep Cloudflare contact/newsletter form handling for the US launch.
- [x] Launch decision: European location links on `.com` should go out to `https://timemission.eu`.
- [x] Launch decision: live scoring and API-driven location data are post-launch work, not a launch blocker.

## SEO Redirect Answer

Redirects do not kill SEO when they are done correctly. They are the main way to preserve search signals during URL changes. Google explicitly recommends server-side permanent redirects, such as `301` or `308`, for permanent URL moves, and says permanent redirects do not cause PageRank loss.

The SEO risk comes from bad migration patterns:

- [ ] No high-value old URL returns a `404` after cutover.
- [ ] No high-value old URL redirects to an irrelevant page, especially not the homepage, unless the old content was truly removed or consolidated there.
- [ ] Redirects are one hop where possible: old URL -> final canonical URL -> `200`.
- [ ] Canonicals on new pages point to the final `https://timemission.com/...` URL.
- [ ] Internal links already point to clean canonical URLs, not to redirected `.html` or legacy URLs.
- [ ] New sitemap contains only final canonical URLs.
- [ ] Production preview and production launch do not expose `noindex` on public pages.
- [ ] Redirects stay in place for at least 1 year, preferably indefinitely for URLs with backlinks or search traffic.

Expected SEO behavior: temporary ranking/indexing fluctuation is normal after a visible site move. The goal is to avoid permanent loss by giving Google and users a clean URL map, fresh sitemap, and stable final destinations.

References:

- Google Search Central, site moves with URL changes: `https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes`
- Google Search Central, redirects: `https://developers.google.com/search/docs/crawling-indexing/301-redirects`

## Decision Gates

### Must Be Done Before Cutover

- [ ] Existing developer provides DNS zone export and confirms registrar/nameserver access.
- [ ] Existing developer provides the current URL/link/redirect inventory for `timemission.com`.
- [x] EU destination URLs are set to `https://timemission.eu/antwerp` and `https://timemission.eu/brussels`.
- [ ] Existing developer confirms current hosting rollback path and keeps old hosting available through launch week.
- [ ] Search Console export of top URLs, indexed pages, external-linked pages, and 404s is reviewed.
- [ ] Redirect QA confirms all important URLs from Search Console either resolve directly or redirect to the closest equivalent page.
- [ ] Cloudflare Pages preview is manually validated using production-like env vars, secrets, bindings, and custom-domain behavior.
- [ ] Contact form and newsletter form work on Cloudflare preview and deliver to real inboxes.
- [ ] Booking CTAs and ROLLER/Briq paths work for open locations.
- [ ] GTM/GA4/Meta/TikTok tracking is validated in preview/debug mode.
- [ ] DNS records for email and all active subdomains are preserved in Cloudflare.
- [ ] Rollback owner and launch-day communications owner are assigned.

### Can Be Accepted For Launch If Documented

- [ ] Minor visual polish that does not block booking, forms, navigation, SEO, or mobile usability.
- [ ] Preview deployment has Cloudflare preview `noindex` headers, as long as production custom domain does not.
- [ ] Low-value bot/WordPress-era paths redirect to `/` when no equivalent content exists.
- [ ] `npm audit` advisories are accepted only if they are confirmed build/dev-tooling-only and no production runtime exposure exists.

## Existing Developer Intake

Ask the existing developer for these exact items.

### Domain And DNS

- [ ] Registrar login or a launch-window commitment to change nameservers.
- [ ] Current DNS zone export for `timemission.com`.
- [ ] Current apex, `www`, MX, TXT, SPF, DKIM, DMARC, CAA, and any verification records.
- [ ] Current subdomains and owners, including:
  - [ ] `asset.timemission.com`
  - [ ] `api-1.timemission.com`
  - [ ] `tickets.timemission.com`
  - [ ] `sgtm.timemission.com`, if server-side GTM is in use
- [ ] Confirmation that Google Workspace MX records remain active after Cloudflare onboarding.

### Current Production And Rollback

- [ ] Current hosting provider/admin access.
- [ ] Current deploy artifact or backup.
- [ ] Current server routing rules, redirects, and rewrite behavior.
- [ ] Current `robots.txt` and `sitemap.xml` situation, if any.
- [ ] Agreement to keep the old host available for rollback through the first post-launch week.

### SEO And Analytics

- [ ] Google Search Console owner access for `timemission.com`.
- [ ] Export of top pages by clicks/impressions for the last 3-6 months.
- [ ] Export of indexed URLs, not-found URLs, and pages with backlinks.
- [ ] GA4 access for the live property.
- [ ] GTM admin access for the live web container.
- [ ] Meta Pixel and TikTok Pixel access or confirmation of who can update domain/cookie settings.

### Booking, Assets, And APIs

- [ ] ROLLER/Venue Manager access or a testing contact who can confirm checkout.
- [ ] Confirmation from each booking provider that checkout URLs can be embedded/framed on `timemission.com`.
- [ ] Test purchase policy for launch QA.
- [ ] Ownership and future plan for `asset.timemission.com` on BunnyCDN.
- [ ] Ownership and future plan for `api-1.timemission.com`.
- [ ] Decision for `tickets.timemission.com`: deploy DNS/TLS if still needed, or migrate all booking URLs away from it before launch.
- [ ] API docs and sample responses for post-launch live scoring, opening hours, address/phone, booking provider config, temporary closure/status messages, and coming-soon state.
- [ ] Confirmation that EU booking/location experiences stay on `https://timemission.eu` until the separate EU-hosted rollout is planned.

## Cloudflare Setup

Cloudflare docs:

- Custom domains: `https://developers.cloudflare.com/pages/configuration/custom-domains/`
- Pages Functions bindings/secrets: `https://developers.cloudflare.com/pages/functions/bindings/`
- Redirecting `www` to apex: `https://developers.cloudflare.com/pages/how-to/www-redirect/`

### Cloudflare Zone

- [ ] Add `timemission.com` to Cloudflare.
- [ ] Import or recreate all DNS records from the existing zone export.
- [ ] Verify Google Workspace MX records are present before nameserver switch.
- [ ] Verify SPF/DKIM/DMARC records are present before nameserver switch.
- [ ] Keep proxy status intentional for every record.
- [ ] Do not delete old DNS at SiteGround until Cloudflare nameservers are fully active.

### Cloudflare Pages Project

- [ ] Confirm Pages project name: `time-mission-website`.
- [ ] Confirm build output is `dist`.
- [ ] Confirm deployment is from repo root so `functions/` uploads with `dist`.
- [ ] Confirm `_headers` and `_redirects` are present in deployed output.
- [ ] Add custom domain `timemission.com`.
- [ ] Add custom domain `www.timemission.com`, or create a Cloudflare redirect from `www` to apex.
- [ ] Confirm canonical preference is apex: `https://timemission.com`.

### Build-Time Environment Variables

Set these in Cloudflare Pages before preview sign-off:

- [ ] `PUBLIC_TURNSTILE_SITE_KEY`
- [ ] `PUBLIC_GTM_CONTAINER_ID`
- [ ] `PUBLIC_SGTM_CONTAINER_URL`, if server-side GTM is used
- [ ] `PUBLIC_SGTM_COLLECT_PATH`, if server-side GTM uses a non-default path
- [ ] `PUBLIC_TM_MEDIA_BASE`, if large media is hosted on R2/public media origin
- [ ] `PAYLOAD_CMS_ORIGIN`, if preview/build should pull CMS content
- [ ] `PAYLOAD_CMS_ALLOWED_HOSTS`, if CMS host validation is enabled

### Pages Function Secrets And Bindings

Set these before preview sign-off:

- [ ] `FORM_EMAIL_API_KEY`
- [ ] `FORM_FROM_EMAIL`
- [ ] `CONTACT_TO_EMAIL`
- [ ] `NEWSLETTER_TO_EMAIL`
- [ ] `TURNSTILE_SECRET_KEY`
- [ ] D1 database created for form submissions and bound as `FORM_SUBMISSIONS_DB`
- [ ] D1 migration applied: `npx wrangler d1 migrations apply time-mission-forms --remote`
- [ ] KV namespace bound as `FORM_RATE_LIMIT_KV`
- [ ] Optional: `FORM_RATE_LIMIT_IP_10M`
- [ ] Optional: `FORM_RATE_LIMIT_IP_HOUR`
- [ ] Optional: `FORM_RATE_LIMIT_EMAIL_HOUR`

## Redirect And SEO QA

### URL Inventory

- [ ] Export top Search Console URLs by clicks and impressions.
- [ ] Export top landing pages from GA4.
- [ ] Export URLs with external links from Search Console.
- [ ] Crawl the current live site, if possible.
- [ ] Add any missing important source URL to `_redirects` or document why it should `404`/`410`.
- [ ] Review any old URL currently mapped to `/`; if it had real content or backlinks, map it to a closer equivalent page.

### Command Checks On Preview

Set the preview host:

```bash
PREVIEW_HOST="https://your-preview-host.pages.dev"
```

Check important legacy paths:

```bash
for path in \
  /about.html \
  /experiences.html \
  /locations/index.html \
  /privacy-policy \
  /adult-birthday-parties \
  /palisades \
  /wp-login.php \
  /FAQ \
  /Philadelphia
do
  echo "=== $path"
  curl -sI -L --max-redirs 5 "$PREVIEW_HOST$path" | grep -iE 'HTTP/|location:|x-robots-tag|content-security-policy'
done
```

Pass criteria:

- [ ] Meaningful legacy pages return `301` or `308` and end on a relevant `200`.
- [ ] Junk/bot paths return the documented redirect or an intentional error.
- [ ] No chain exceeds 3 hops; target is 1 hop wherever possible.
- [ ] No redirect loop.
- [ ] No production page has `x-robots-tag: noindex`.

### Sitemap, Robots, And Canonicals

```bash
curl -sI "$PREVIEW_HOST/sitemap.xml"
curl -sI "$PREVIEW_HOST/robots.txt"
curl -sI "$PREVIEW_HOST/llms.txt"
curl -s "$PREVIEW_HOST/sitemap.xml" | head
```

- [ ] `sitemap.xml` returns `200`.
- [ ] `robots.txt` returns `200`.
- [ ] `llms.txt` returns `200`.
- [ ] Sitemap includes only clean canonical URLs.
- [ ] Homepage canonical is `https://timemission.com/`.
- [ ] Representative location canonicals use clean apex URLs.

## Preview Validation

Run locally before deploy:

```bash
npm ci
npm run verify
npm audit --audit-level=moderate
```

Deploy to a staging Pages project or non-production preview first:

```bash
npm run build:astro
npm run deploy:pages -- --project-name=time-mission-website-staging
```

If using the production Pages project for preview, do not attach or promote the production custom domain until this section passes.

- [ ] Homepage loads.
- [ ] `/locations` loads.
- [ ] `/philadelphia` loads.
- [ ] `/houston` loads.
- [ ] `/faq` loads.
- [ ] `/contact` loads.
- [ ] `/this-route-does-not-exist-xyz` returns a sensible 404.
- [ ] CSS, JS, fonts, images, and JSON data load with no critical 404s.
- [ ] Security headers are present.
- [ ] CSP does not block first-party scripts, GTM, Turnstile, or booking widgets.
- [ ] EU cookie banner appears on `/antwerp`.
- [ ] US pages do not show the EU-only banner unless policy changed.

## Forms QA

- [ ] Contact form renders Turnstile.
- [ ] Contact form valid submission redirects to `/contact-thank-you`.
- [ ] Contact recipient inbox receives the email.
- [ ] Newsletter form valid submission redirects to `/contact-thank-you`.
- [ ] Newsletter recipient inbox receives the email.
- [ ] Submission with missing Turnstile token is rejected.
- [ ] Honeypot submission does not deliver email.
- [ ] Repeated requests eventually return `429`.
- [ ] Form emails contain no unexpected PII leakage outside intended recipients.

## Booking QA

- [ ] Open-location ticket panel hydrates with correct location.
- [ ] Global Book Now prompts for location selection when no location is selected.
- [ ] Global Book Now uses the currently selected location after a location is selected.
- [ ] Location-page Book Now uses that page's location, not a previously saved location.
- [ ] `?book=1` opens embedded checkout for an open location and does not navigate offsite.
- [ ] ROLLER booking paths open via embedded checkout/widget for Philadelphia, Mount Prospect, Manassas, Houston, and Orland Park.
- [ ] Non-ROLLER US booking paths open in the onsite booking iframe for Lincoln.
- [ ] European location CTAs route to their location-specific `https://timemission.eu/...` pages and are not embedded in the US `.com` booking iframe.
- [ ] West Nyack/Briq path stays embedded on site.
- [ ] Mobile location picker opens the venue page with one tap.
- [ ] Gift card links work.
- [ ] Group event CTAs work.
- [ ] Test purchase or approved checkout simulation completes.
- [ ] Confirmation page or vendor final step is reachable.
- [ ] No mixed-content warnings.
- [ ] CSP allows the booking iframe/widget domains and does not block checkout frames.
- [ ] Hero video shows the poster image first and does not flash a black frame before playback.

## Analytics QA

- [ ] GTM container loads in preview/debug mode.
- [ ] Consent defaults match region/profile expectations.
- [ ] Booking CTA click appears in GTM/GA4 debug tooling.
- [ ] Contact form focus/submission event appears where expected.
- [ ] Web vitals event appears where expected.
- [ ] Purchase/conversion path is validated through ROLLER/Briq if access allows.
- [ ] No email, phone, name, or raw form message is pushed to GA4/dataLayer.
- [ ] Meta/TikTok pixel cookie domain settings are updated for `.timemission.com` if still used.

## Launch Day

Recommended launch time: low-traffic window with all owners online.

- [ ] Announce launch start and freeze unrelated edits.
- [ ] Confirm latest `npm run verify` is green.
- [ ] Confirm latest preview checks are green.
- [ ] Confirm rollback path and owner.
- [ ] Confirm old host is still available.
- [ ] Confirm Cloudflare DNS records are complete.
- [ ] Update nameservers at registrar to Cloudflare-assigned nameservers.
- [ ] Wait for Cloudflare zone to become active.
- [ ] Attach/promote production custom domains in Pages if not already active.
- [ ] Verify `https://timemission.com`.
- [ ] Verify `https://www.timemission.com` redirects or resolves according to the chosen canonical plan.
- [ ] Submit new `https://timemission.com/sitemap.xml` in Search Console.
- [ ] Spot-check 10-20 Search Console top URLs.
- [ ] Spot-check forms, booking, analytics, redirects, and headers.
- [ ] Announce launch complete only after the checks above pass.

## Post-Launch Monitoring

First 2 hours:

- [ ] Monitor homepage, location pages, booking, forms, and analytics.
- [ ] Watch Cloudflare logs/analytics for 404 spikes.
- [ ] Watch form inbox delivery.
- [ ] Check Search Console URL Inspection for homepage and one location page.

First 48 hours:

- [ ] Review Search Console indexing/crawl errors.
- [ ] Review GA4 traffic continuity.
- [ ] Review high-traffic old URLs for redirect correctness.
- [ ] Fix missing redirects immediately.
- [ ] Keep old hosting available.

First 2 weeks:

- [ ] Check Search Console Coverage/Pages report every 2-3 days.
- [ ] Check ranking/traffic changes against expected migration volatility.
- [ ] Update any external high-value links you control.
- [ ] Keep redirects in place.

## Post-Launch API And EU Follow-Up

- [ ] Review the existing developer's scoring/location API contract and decide which fields become source-of-truth for the new site.
- [ ] Design a constrained scoring module that can show today/week/month/all-time results without exposing annual volume.
- [ ] Plan the EU deployment separately so EU pages and consent behavior can remain EU-hosted.
- [ ] Decide whether `.com/antwerp` and `.com/brussels` remain lightweight discovery pages, redirect to `timemission.eu`, or become part of the EU deployment.

## Rollback Triggers

Rollback or pause if any of these happen:

- [ ] Homepage or primary location pages cannot load.
- [ ] Booking fails for open locations.
- [ ] Contact/newsletter forms fail in production.
- [ ] Major redirect loop or high-value URL 404 pattern appears.
- [ ] Production accidentally ships `noindex` on public pages.
- [ ] Critical assets or scripts are blocked by CSP.
- [ ] Analytics/conversion tracking is fully blind and cannot be fixed quickly.

Rollback reference: `docs/rollback-runbook.md`.
