# Redirect map — Phase 02 clean URLs

Canonical routing for Time Mission uses **clean extensionless paths with no trailing slash** (except the root `/`). Legacy `.html` sources and marketing shortcuts redirect **one hop** to those canonical URLs via `_redirects` (Netlify / Cloudflare Pages format).

See also: `src/data/routes.json` (machine-readable registry), `_redirects` (deployed rules), and `npm run check:routes`.

## Cloudflare Pages Primary Behavior

Cloudflare Pages is the **primary** static hosting target for this repo. The `_redirects` file at the publish root is consumed by Pages-style hosts so visitors and bots requesting legacy paths receive an explicit HTTP redirect to the matching canonical route.

Legacy `.html` document URLs redirect directly to clean paths (for example `/about.html` → `/about`). Marketing shortcuts redirect to canonical destinations, optionally preserving fragment identifiers on the destination path.

Preview deployments should be used to confirm redirect Location headers and status codes before production cutover.

## Query Strings

Static `_redirects` rules match on **path only**. Query strings are typically preserved by the platform when issuing the redirect response, but **exact behavior must be confirmed on Cloudflare Pages preview** before relying on analytics or partner integrations that append query parameters.

If a legacy URL must normalize query parameters, document that requirement explicitly and validate it on preview because platforms differ.

## Fragments

URL fragments (`#...`) are **not sent to the server**. That means:

- Fragment identifiers are applied **only in the browser**. Static `_redirects` parsers match **paths without `#`** — only the leading path participates in server-side redirect matching.
- Destination fragments remain meaningful when expressed as `/groups#birthday`, because the browser applies the fragment client-side after navigation.

When migrating bookmarks or ads that relied on `#sections`, prefer destinations that already express the fragment on the clean canonical target.

## Status Policy

- **`301`** — Permanent moves for durable canonical replacements (legacy `.html` → clean path; consolidated shortcuts).
- **`302`** — Temporary availability / launch redirects only when explicitly documented in the route registry (for example city landing behaviors while inventory changes).

Permanent migrations should not oscillate between `301` and `302` without an intentional SEO discussion.

## Netlify Caveats

Netlify also understands `_redirects`, but defaults and edge-case handling can **differ from Cloudflare Pages** (for example subtle differences around trailing slashes, splats, or forced redirects).

Treat Netlify snippets here as **examples** — validate behavior on Netlify preview if Netlify is used.

## Format — `_redirects`

Drop `_redirects` at the site root (repo root for static publishing):

```
/adult-birthday-parties      /groups#birthday           301
/about.html                   /about                   301
```

## For Vercel (`vercel.json`)

```json
{
  "redirects": [
    { "source": "/adult-birthday-parties", "destination": "/groups#birthday", "permanent": true },
    { "source": "/about.html", "destination": "/about", "permanent": true },
    { "source": "/experiences.html", "destination": "/missions", "permanent": true },
    { "source": "/experiences", "destination": "/missions", "permanent": true }
  ]
}
```

## Verification Checklist

Post-deploy on **Cloudflare Pages preview**, spot-check representative redirects:

```bash
for path in /about.html /experiences.html /adult-birthday-parties /locations/index.html /privacy-policy; do
  echo -n "$path -> "
  curl -sI "https://timemission.com$path" | head -2 | grep -iE 'location|http/'
done
```

Expected: redirects return the documented status (`301`/`302`) with `Location:` pointing at the clean canonical destination.

Automated drift checks:

```bash
npm run check:routes -- --redirects
npm run check:sitemap
npm run check:routes -- --sitemap
```

## Source Traffic to Preserve

Before going live, pull Search Console top URLs for the domain and confirm each ranked legacy URL resolves via `_redirects` (add registry-backed rows if gaps appear).

## WordPress-Era Legacy Paths (P1-8)

The following paths existed on the legacy WordPress site (or are well-known WordPress probe URLs from bot traffic) and previously returned 404 on the new Astro site. As of the P1-8 fix they redirect with HTTP 301:

| Source | Target | Status | Reason |
|--------|--------|--------|--------|
| `/wp-login.php` | `/` | 301 | WP login probe; deindex via 301 |
| `/wp-admin`, `/wp-admin/*` | `/` | 301 | WP admin paths |
| `/cart`, `/cart/*` | `/` | 301 | WooCommerce cart paths |
| `/checkout`, `/checkout/*` | `/` | 301 | WooCommerce checkout paths |
| `/shop`, `/shop/*` | `/` | 301 | WooCommerce shop archives |
| `/feed` | `/` | 301 | WP RSS feed |
| `/atom.xml` | `/` | 301 | WP Atom feed |
| `/wp-sitemap.xml` | `/` | 301 | WP-generated sitemap; canonical sitemap is `/sitemap.xml` |
| `/palisades` | `/west-nyack` | 301 | Legacy slug; West Nyack venue is located at Palisades Center (see `data/locations.json#west-nyack`, brand name "Time Mission Palisades") |

### Why 301 and not 410 Gone

The original audit (P1-8) recommended 410 Gone for WordPress-era paths so search engines deindex faster. **Cloudflare Pages `_redirects` only supports status codes 200 (rewrite), 301, 302, 303, 307, and 308 — 410 is not available.** Emitting 410 would require a Cloudflare Worker or Pages Function, which is out of scope for a static-redirect change.

The SEO outcome of 301-to-`/` is comparable for these low-volume bot/legacy paths: search engines drop the URL after a few crawl cycles either way, and any residual human traffic lands on the homepage instead of a 404.

If 410 becomes a hard requirement (for example to suppress scoring delays in Search Console), a Cloudflare Pages Function under `functions/` could intercept these paths and return `new Response(null, { status: 410 })`. That is intentionally not done here.

### Verification on Cloudflare Pages preview

After deploying to a Pages preview, spot-check:

```bash
for path in /wp-login.php /wp-admin /wp-admin/users.php /cart /checkout /shop /feed /atom.xml /wp-sitemap.xml /palisades; do
  echo -n "$path -> "
  curl -sI "https://<preview-host>$path" | head -2 | grep -iE 'location|http/'
done
```

Expected: every path returns `HTTP/.* 301` with a `Location:` header pointing to `/` (or `/west-nyack` for `/palisades`).
