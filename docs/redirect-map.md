# 301 Redirect Map — Old → New

For Ari / hosting config (Netlify `_redirects`, Vercel `vercel.json`, or equivalent).

The old site had ~12 event-type landing pages and two alternative location slugs.
On the new site those are consolidated into `groups.html` (with anchors) and
canonical location slugs. These redirects preserve any SEO equity and prevent
404s for customers following stale links.

## Format

If using Netlify, drop this into a file named `_redirects` at the site root:

```
/adult-birthday-parties      /groups.html#birthday           301
/kids-birthday-party         /groups.html#birthday           301
/bachelorette-party          /groups.html#private            301
/date-night-ideas            /groups.html#private            301
/corporate-events            /groups.html#corporate          301
/team-building               /groups.html#corporate          301
/school-field-trips          /groups.html#private            301
/youth-group-camp            /groups.html#private            301
/family-gathering            /groups.html#private            301
/bus-tour                    /groups.html                    301
/house-rules                 /code-of-conduct.html           301
/licensing                   /licensing.html                 301
/privacy-policy              /privacy.html                   301
/privacy-policy/             /privacy.html                   301
/terms-and-conditions        /terms.html                     301

# Location slug migration
/mountprospect               /mount-prospect.html            301
/providence                  /lincoln.html                   301

# Root index — coming_soon city redirects
/orland-park                 /locations/                     302
/dallas                      /locations/                     302
/brussels                    /locations/                     302

# Old SPA catchall — anything not matched above falls through to 404
```

## For Vercel (vercel.json)

```json
{
  "redirects": [
    { "source": "/adult-birthday-parties", "destination": "/groups.html#birthday", "permanent": true },
    { "source": "/kids-birthday-party",    "destination": "/groups.html#birthday", "permanent": true },
    { "source": "/bachelorette-party",     "destination": "/groups.html#private",  "permanent": true },
    { "source": "/date-night-ideas",       "destination": "/groups.html#private",  "permanent": true },
    { "source": "/corporate-events",       "destination": "/groups.html#corporate","permanent": true },
    { "source": "/team-building",          "destination": "/groups.html#corporate","permanent": true },
    { "source": "/school-field-trips",     "destination": "/groups.html#private",  "permanent": true },
    { "source": "/youth-group-camp",       "destination": "/groups.html#private",  "permanent": true },
    { "source": "/family-gathering",       "destination": "/groups.html#private",  "permanent": true },
    { "source": "/bus-tour",               "destination": "/groups.html",          "permanent": true },
    { "source": "/house-rules",            "destination": "/code-of-conduct.html", "permanent": true },
    { "source": "/licensing",              "destination": "/licensing.html",       "permanent": true },
    { "source": "/privacy-policy",         "destination": "/privacy.html",         "permanent": true },
    { "source": "/terms-and-conditions",   "destination": "/terms.html",           "permanent": true },
    { "source": "/mountprospect",          "destination": "/mount-prospect.html",  "permanent": true }
  ]
}
```

## Verification Checklist

Post-deploy, spot-check each redirect:

```bash
for path in /adult-birthday-parties /kids-birthday-party /corporate-events /house-rules /licensing /mountprospect; do
  echo -n "$path -> "
  curl -sI "https://timemission.com$path" | head -2 | grep -iE 'location|http/'
done
```

Expected: every redirect returns `301` with the `Location:` header pointing at the new URL.

## Source Traffic to Preserve

Before going live, ask Ryan to pull Google Search Console data for the top 20
URLs on the old site. If any ranked URL is NOT covered by the map above, add it.

Known to exist on the old site that we need to verify are covered:
- `/` — stays `/`
- `/experiences` or `/missions` — check if old site had one; new site uses `/experiences.html`
- `/gift-cards` — check; new is `/gift-cards.html`
- `/contact` — check; new is `/contact.html`
- `/faq` — old returned 404; no redirect needed
