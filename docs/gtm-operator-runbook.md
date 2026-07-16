# GTM Operator Runbook

## Container configuration

1. Create or open the production GTM **web** container for `timemission.com`.
2. Set Astro env **`PUBLIC_GTM_CONTAINER_ID=GTM-WQPWRNJB`** in the build environment. The code defaults to this ID, but the explicit Cloudflare Pages env var keeps the production measurement dependency visible in project settings.
3. Publish the workspace after changes; use **Preview** / Tag Assistant against a preview deployment before production.

### Optional: web GTM + server-side GTM support

If you are routing browser hits through an sGTM endpoint, set:

- `PUBLIC_SGTM_CONTAINER_URL` (example: `https://sgtm.timemission.com`)
- `PUBLIC_SGTM_COLLECT_PATH` (optional, default: `/g/collect`)

If the sGTM hostname differs from the example, update **`connect-src`** in root `_headers` (and run `node scripts/sync-static-to-public.mjs`) so beacons to that origin are not CSP-blocked.

The site will keep loading your **web GTM** container as usual and also push a startup `dataLayer` event:

- `event: "tm_tagging_config"`
- `tagging_mode: "web_only"` or `"web_and_sgtm"`
- `tagging_server_url`
- `tagging_server_collect_path`
- `web_gtm_container_id`
- `consent_profile`

Use those values in GTM variables/triggers to route specific tags to server-side endpoints without changing site code again.

## Consent Mode v2

- Defaults are set in `SiteHead.astro` **before** the GTM snippet runs with route-aware profiles:
  - `eu_strict` (EU location pages): marketing/analytics defaults **denied**
  - `us_open` (all other generated public routes): marketing/analytics defaults **granted**
  - `global_strict` (reserved future strict routes or fallback behavior): marketing/analytics defaults **denied**
- A CMP or operator can still override at runtime via `window.TMConsent.update({ … })`.
- Validate in Tag Assistant that **`consent`** default and any **update** events match your CMP roadmap.

## GA4 DebugView

1. Enable debug in browser (GA Debugger extension or `debug_mode` in configuration).
2. Trigger on-site actions (booking CTA, ticket panel, contact form focus).
3. Confirm **non-PII** parameters only — see `docs/analytics-event-contract.md`.

## Offsite Pipedrive group forms

Set each Pipedrive form's success redirect to:

```text
https://www.timemission.com/group-form-thank-you/{location_slug}/{form_subject}
```

The generated pages emit `GROUP_FORM_SUBMIT_SUCCESS` with `parameters.LOCATION_SLUG`, `parameters.LOCATION_NAME`, `parameters.REGION`, `parameters.FORM_NAME`, `parameters.FORM_SUBJECT`, and `parameters.PROVIDER`. Use `parameters.LOCATION_SLUG` for location routing and `parameters.FORM_SUBJECT` for group-form type segmentation.

## Shared Jotform group form

Form `261936424348059` is rendered from its HTML source on the Time Mission site at:

```text
https://www.timemission.com/groups/inquire/{location_slug}/{form_subject}
```

The site fills Jotform's existing hidden `location` and `typeA` fields with the selected location and the non-PII on-site form URL. In Jotform, set **Settings → Thank You Page → Redirect to an external link after submission** to this exact URL and leave **Redirect with HTTP POST** off:

```text
https://www.timemission.com/group-form-thank-you/jotform?location={location}&source={typeA}
```

Jotform replaces `{location}` and `{typeA}` from the fields' unique names. The success page validates both values against the three allowed locations and seven controlled group-form subjects before it emits:

- `event: "GROUP_FORM_SUBMIT_SUCCESS"`
- `parameters.PROVIDER: "jotform"`
- `parameters.FORM_NAME: "jotform_group"`
- `parameters.LOCATION_SLUG`: `manassas`, `mount-prospect`, or `orland-park`
- `parameters.FORM_SUBJECT`: the controlled event-type slug

The top Group Specialist telephone link remains in the Time Mission page rather than a cross-origin iframe. It emits `PHONE_CLICK` with `parameters.CTA_ID: "group_form_phone"`; use the event's top-level `page_path` and `parameters.LOCATION_SLUG` to compare calls by route/location. The phone number itself is intentionally not sent to GTM.

## Staging vs production

- Use separate containers or workspaces per environment when possible.
- Never send **staging** GTM IDs to production build env (and vice versa).

## PII reminder

- Do not configure tags that push **email**, **name**, **phone**, or raw **message** text from forms into `dataLayer` or GA4 without legal approval.

## Reference

- Event names and parameter aliases: `src/data/site/analytics-labels.json`
- ROLLER + cross-domain: `docs/roller-booking-launch-checklist.md`
- CMP + regional consent operations: `docs/cmp-consent-matrix.md`
- Copy-paste GTM + sGTM setup: `docs/gtm-sgtm-implementation-recipe.md`
