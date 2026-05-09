# Cloudflare Pages preview validation (VER-05)

Use this checklist on a **Cloudflare Pages preview deployment** before promoting the Astro cutover. Tie each row to what you can verify in the browser, with `curl`, or via repo scripts where noted.

**Preview hygiene:** Use a branch alias or PR preview URL; confirm access controls (password protection, team-only) match your org policy. Record the exact preview hostname for incident follow-up.

## Redirects and canonicals

| Check | How to verify | Pass criteria | Related automation |
|--------|----------------|---------------|-------------------|
| `_redirects` deployed | Dashboard → deployment → confirm `_redirects` in served root; or `curl -sI https://{preview}/_redirects` (if exposed) | Rules present; no accidental empty file | `npm run check:routes -- --dist` (registry vs `dist/`) |
| Legacy `.html` → clean URL | `curl -sI https://{preview}/faq.html` | `301`/`308` to `/faq` (or equivalent single hop); **no redirect loop** (`curl -sI -L --max-redirs 5` ends on 200) | `_redirects` in `public/` |
| Redirect loop sniff | `curl -sI -L --max-redirs 10 https://{preview}/` and sample legacy URLs | Final response 200; redirect chain under 10 hops | Manual |
| Canonical URLs extensionless | Open `/`, `/faq`, `/philadelphia` in browser | Address bar shows **no** `.html`; content loads | `npm run check:sitemap-output` |

## Headers and security

| Check | How to verify | Pass criteria | Related automation |
|--------|----------------|---------------|-------------------|
| `_headers` served | `curl -sI https://{preview}/` | `content-security-policy`, `strict-transport-security`, `x-content-type-options`, `x-frame-options`, `referrer-policy` present (or documented CDN equivalents) | `public/_headers` |

## Discovery and SEO surfaces

| Check | How to verify | Pass criteria | Related automation |
|--------|----------------|---------------|-------------------|
| `sitemap.xml` | `curl -s https://{preview}/sitemap.xml` | 200; only clean canonical URLs | `npm run check:sitemap-output` |
| `robots.txt` | `curl -s https://{preview}/robots.txt` | 200; AI crawler lines match intent | `npm run check:robots-ai` |
| `llms.txt` | `curl -s https://{preview}/llms.txt` | 200 | `npm run check:llms-txt` |

## Error handling and assets

| Check | How to verify | Pass criteria | Related automation |
|--------|----------------|---------------|-------------------|
| 404 behavior | `curl -sI https://{preview}/this-route-does-not-exist-xyz` | Sensible 404 (not infinite redirect) | Manual |
| Critical assets | Load `/`, `/faq`, one location in browser (Network tab) | hero video poster, fonts, `locations.json`, primary CSS/JS 200 | Manual |
| JSON-LD spot-check | View source on `/`, `/faq`, open location | `<script type="application/ld+json">` present where expected | `npm run check:schema-output` |

## Forms and Functions

| Check | How to verify | Pass criteria | Related automation |
|--------|----------------|---------------|-------------------|
| Pages Functions uploaded | Deploy with `npm run deploy:pages` from repo root, then open the deployment details | `functions/` routes are included in the Wrangler deployment; dashboard drag-and-drop is not used for this release | `wrangler.toml`, `functions/api/contact.js`, `functions/api/newsletter.js` |
| Contact form | Submit `/contact` with a valid Turnstile challenge | Redirects to `/contact-thank-you`; configured `CONTACT_TO_EMAIL` inbox receives a Resend email | `npm run test:unit` |
| Newsletter form | Submit a representative newsletter form | Redirects to `/contact-thank-you`; configured `NEWSLETTER_TO_EMAIL` inbox receives a Resend email | `npm run test:unit` |
| Form abuse controls | Submit without Turnstile token or with a filled honeypot in a controlled test | Missing Turnstile is rejected; honeypot submissions silently succeed without delivery | `tests/form-handler.test.mjs` |

## Analytics and third parties

| Check | How to verify | Pass criteria | Related automation |
|--------|----------------|---------------|-------------------|
| GTM / tag behavior | GTM Preview / DebugView (see `docs/gtm-operator-runbook.md`) | Container loads; consent path sane; no PII in test events | `docs/gtm-operator-runbook.md` |
| ROLLER URLs | Sample booking/gift URLs from ticket panel (open location) | Reach `https://` ROLLER destinations; no mixed-content warnings | `docs/roller-booking-launch-checklist.md` |

## Cross-links

- **Rollback rehearsal:** [rollback-runbook.md](rollback-runbook.md) (Cloudflare section + failure triggers).
- **Launch verification order:** [verification-pipeline.md](verification-pipeline.md).
