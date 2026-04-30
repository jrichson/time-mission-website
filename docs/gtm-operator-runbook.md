# GTM operator runbook (Phase 6)

## Container configuration

1. Create or open the production GTM **web** container for `timemission.com`.
2. Set Astro env **`PUBLIC_GTM_CONTAINER_ID`** (e.g. `GTM-XXXX`) in the build environment. Omit for builds that must not load GTM (local smoke without third-party requests is fine).
3. Publish the workspace after changes; use **Preview** / Tag Assistant against a preview deployment before production.

## Consent Mode v2

- Defaults are set in `SiteHead.astro` **before** the GTM snippet runs: marketing/analytics storage starts **denied** until a CMP or operator calls `window.TMConsent.update({ … })`.
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
