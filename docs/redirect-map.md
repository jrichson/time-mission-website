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
