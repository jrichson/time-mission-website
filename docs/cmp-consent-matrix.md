# CMP consent matrix (web GTM + sGTM)

## Purpose

Define one consent policy surface for:

- Browser-side GTM tags
- Server-side GTM forwarding and tag execution
- Region-aware defaults that can still be overridden by the CMP

This document is implementation guidance; legal counsel remains the source of truth for final policy.

## Runtime signals from site code

The site pushes `tm_tagging_config` on startup with:

- `tagging_mode`
- `tagging_server_url`
- `tagging_server_collect_path`
- `web_gtm_container_id`
- `consent_profile`

`consent_profile` is route-derived:

- `eu_strict` for EU location pages
- `us_open` for US location pages
- `global_strict` for non-location/global pages

## Consent defaults by profile

| Consent profile | ad_storage | analytics_storage | ad_user_data | ad_personalization | Notes |
|---|---|---|---|---|---|
| `eu_strict` | denied | denied | denied | denied | Default-deny until CMP update |
| `us_open` | granted | granted | granted | granted | More permissive baseline; still CMP-overridable |
| `global_strict` | denied | denied | denied | denied | Conservative default for global/non-location pages |

## GTM web container mapping

1. Create Data Layer Variables:
   - `dlv.consent_profile`
   - `dlv.tagging_mode`
   - `dlv.tagging_server_url`
   - `dlv.tagging_server_collect_path`
2. Create Custom Event Trigger:
   - Event name: `tm_tagging_config`
3. In GA4/config tags:
   - Respect Consent Mode checks.
   - Route transport/server endpoint only when:
     - `dlv.tagging_mode == web_and_sgtm`, and
     - Consent conditions allow the tag to fire.

## sGTM container mapping

In server-side container logic:

1. Preserve and inspect Consent Mode state on incoming events.
2. Enforce destination-level policy by consent state, not only by source profile.
3. Block marketing destinations when consent is denied.
4. Keep analytics destinations aligned with consent mode and regional requirements.
5. Preserve `event_id` for dedupe between browser + server paths.

## Regional operating policy

### EU pages (`eu_strict`)

- Keep default-deny behavior.
- Require explicit CMP update before ad/analytics destinations.
- Do not rely on inferred or previously stored consent for ad personalization.

### US pages (`us_open`)

- Default-granted baseline can run for allowed states/policies.
- CMP should still apply user-level overrides and opt-outs.
- If state-level restrictions are required, CMP must call `TMConsent.update` quickly on page load.

### Global pages (`global_strict`)

- Keep conservative default-deny.
- Use CMP updates to enable where legally appropriate.

## Dedupe and attribution controls

- Use `event_id` as the primary dedupe key across web GTM and sGTM.
- Attribution persistence is first-party, 30-day TTL, and atomically replaced on new paid landing.
- Do not merge partial campaign keys across sessions.

## Data minimization requirements

- Never pass direct identifiers (email, phone, name, free-text message) in analytics payloads.
- For lead-intent clicks, use categorical IDs (`email_link`, `phone_link`) only.
- Keep payload values to route/category/campaign metadata.

## QA checklist

- GTM Preview shows `tm_tagging_config` on load.
- `consent_profile` value matches page type (EU/US/global).
- CMP update events change consent state as expected.
- sGTM receives events only when expected by consent policy.
- Dedupe behavior is stable for web + server copies of same event.
- No PII appears in `dataLayer`, GA4 DebugView, or sGTM logs.

## Implementation companion

For exact GTM objects (variables, triggers, tag conditions), use:

- `docs/gtm-sgtm-implementation-recipe.md`
