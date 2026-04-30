# GTM operator runbook (Phase 6)

## Container configuration

1. Create or open the production GTM **web** container for `timemission.com`.
2. Set Astro env **`PUBLIC_GTM_CONTAINER_ID`** (e.g. `GTM-XXXX`) in the build environment. Omit for builds that must not load GTM (local smoke without third-party requests is fine).
3. Publish the workspace after changes; use **Preview** / Tag Assistant against a preview deployment before production.

### Optional: web GTM + server-side GTM support

If you are routing browser hits through an sGTM endpoint, set:

- `PUBLIC_SGTM_CONTAINER_URL` (example: `https://sgtm.timemission.com`)
- `PUBLIC_SGTM_COLLECT_PATH` (optional, default: `/g/collect`)

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
  - `us_open` (US location pages): marketing/analytics defaults **granted**
  - `global_strict` (all non-location/global pages): marketing/analytics defaults **denied**
- A CMP or operator can still override at runtime via `window.TMConsent.update({ … })`.
- Validate in Tag Assistant that **`consent`** default and any **update** events match your CMP roadmap.

## GA4 DebugView

1. Enable debug in browser (GA Debugger extension or `debug_mode` in configuration).
2. Trigger on-site actions (booking CTA, ticket panel, contact form focus).
3. Confirm **non-PII** parameters only — see `docs/analytics-event-contract.md`.

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
