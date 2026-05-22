# Public Site Cutover Checklist

Status: in progress

This checklist covers the production handoff items that cannot be fully proven by source-level checks alone: hosting configuration, GTM/container work, DNS, asset compression, form delivery, booking verification, and final brand review.

Related documents:

- [rollback-runbook.md](./rollback-runbook.md)
- [cloudflare-preview-validation.md](./cloudflare-preview-validation.md)
- [roller-booking-launch-checklist.md](./roller-booking-launch-checklist.md)
- [verification-pipeline.md](./verification-pipeline.md)

## Automated Gate

Run the canonical gate before any production cutover:

```bash
npm run verify
```

This runs source checks, builds Astro output, validates generated `dist/` artifacts, and runs Playwright smoke coverage against the built site.

Key checks included in the gate:

| Area | Validation |
| --- | --- |
| Schema | Built HTML JSON-LD is validated against the route and location data contracts. |
| Accessibility | Source and generated-output checks cover landmarks, image alt requirements, skip links, and tap targets. |
| Routing | Canonical paths, redirects, sitemap entries, and generated route artifacts are checked together. |
| Booking | Ticket panel parity and booking CTA flows are covered by source checks and smoke tests. |
| Analytics and consent | Non-PII `dataLayer` shapes, Consent Mode defaults, and regional consent profiles are validated. |
| SEO and AI visibility | SEO catalog output, robots rules, `llms.txt`, GEO answer blocks, NAP parity, and sitemap output are checked. |
| Visual smoke | Playwright smoke tests cover representative desktop and mobile flows. |

## Host Dependencies

| Owner | Item | Verification | Status |
| --- | --- | --- | --- |
| Web Dev | Cloudflare case-insensitive routing | Follow [cloudflare-preview-validation.md](./cloudflare-preview-validation.md); mixed-case paths should resolve to canonical lower-case destinations without loops. | [ ] not started |
| Product + Brand | ROLLER / Experience Factory brand strategy | Confirm whether "Experience Factory" appears in live booking, schema, or location copy, and document the accepted brand treatment. | [ ] not started |
| GTM Admin | Meta and TikTok cookie domain settings | Fix domain attributes in GTM where needed and confirm cross-subdomain cookies in GTM Preview. | [ ] not started |
| DevOps | `tickets.timemission.com` DNS and CSP allowlist | Either keep DNS/TLS healthy for the current booking host or migrate booking URLs before tightening CSP. | [ ] not started |
| Web Dev | Cloudflare Pages Functions form backend | Configure secrets, D1 binding, KV binding, Turnstile key, deploy `functions/`, then verify rows, inbox delivery, and rate limiting. | [ ] not started |
| Web Dev | Railway CMS launch env | Confirm Railway origin, allowed origins, public site origin, and deploy hook settings before publishing CMS-driven pages. | [ ] not started |
| Designer | `share-image.jpg` compression | Replace with an optimized file and confirm OG/Twitter previews still render correctly. | [ ] not started |
| Designer + Web Dev | `brochure.pdf` compression | Replace with a compressed readable PDF and confirm the download link still resolves. | [ ] not started |
| DevOps | `api-1.timemission.com` CORS | Narrow CORS for PII-bound traffic or document why broad access is acceptable. | [ ] not started |

## Manual Reviews

### Brand Compliance

Open representative pages in browser preview and compare against the approved brand reference:

- `/`
- `/philadelphia`
- `/antwerp`
- `/groups/birthdays`
- `/terms`
- `/contact`

Confirm typography, imagery, layout rhythm, media behavior, and cookie banner treatment match the accepted design direction. File concrete defects before cutover rather than recording generic approval notes.

### Hero Video Accessibility

Confirm decorative hero videos remain non-focusable and hidden from assistive technology:

```bash
grep 'aria-hidden="true" tabindex="-1"' src/partials/index-main.frag.txt | grep "heroVideo"
```

Rebuild before final confirmation:

```bash
npm run build:astro
```

### Analytics

Use GTM Preview / DebugView to confirm:

- `web_vitals` events appear on the homepage and at least one location page after consent grant.
- Booking CTA, ticket panel, and contact form focus events carry non-PII parameters only.
- Regional consent defaults match the route type.

### Regional Consent

Confirm the cookie banner appears on EU routes such as `/antwerp` and is absent on US open-location routes such as `/philadelphia`.

## Final Sequence

1. Run `npm run verify`.
2. Resolve or explicitly defer every host dependency above.
3. Complete Cloudflare preview validation.
4. Submit contact and newsletter forms on preview; confirm Turnstile, redirect, D1 rows, and inbox delivery.
5. Confirm GTM DebugView and regional consent behavior.
6. Confirm [rollback-runbook.md](./rollback-runbook.md) is current and the rollback ref is available.
7. Cut over production traffic.
