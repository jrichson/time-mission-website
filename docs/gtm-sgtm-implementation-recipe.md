# GTM + sGTM implementation recipe

## Goal

Provide a copy-paste setup for:

- Web GTM container configuration
- Server-side GTM container routing behavior
- Regional consent-aware handling using `consent_profile`

This recipe assumes site code already emits:

- `tm_tagging_config` startup event
- normalized conversion/user-action events
- stable `event_id` for dedupe

## Prerequisites

- Web GTM container is installed via `PUBLIC_GTM_CONTAINER_ID`.
- Optional sGTM endpoint config in build env:
  - `PUBLIC_SGTM_CONTAINER_URL`
  - `PUBLIC_SGTM_COLLECT_PATH` (default `/g/collect`)
- Consent Mode defaults + `TMConsent.update(...)` are active.

## 1) Web GTM: variables

Create **Data Layer Variables**:

- `dlv.event_name` -> `event_name`
- `dlv.event_id` -> `event_id`
- `dlv.parameters` -> `parameters`
- `dlv.parameters.consent_snapshot` -> `parameters.CONSENT_SNAPSHOT`
- `dlv.parameters.consent_profile` -> `parameters.CONSENT_PROFILE`
- `dlv.parameters.consent.ad_storage` -> `parameters.CONSENT_SNAPSHOT.ad_storage`
- `dlv.parameters.consent.analytics_storage` -> `parameters.CONSENT_SNAPSHOT.analytics_storage`
- `dlv.parameters.consent.ad_user_data` -> `parameters.CONSENT_SNAPSHOT.ad_user_data`
- `dlv.parameters.consent.ad_personalization` -> `parameters.CONSENT_SNAPSHOT.ad_personalization`
- `dlv.consent_profile` -> `consent_profile`
- `dlv.tagging_mode` -> `tagging_mode`
- `dlv.tagging_server_url` -> `tagging_server_url`
- `dlv.tagging_server_collect_path` -> `tagging_server_collect_path`
- `dlv.web_gtm_container_id` -> `web_gtm_container_id`

Create **Custom JavaScript Variables**:

### `jsv.isWebAndSgtm`

```javascript
function() {
  return {{dlv.tagging_mode}} === 'web_and_sgtm';
}
```

### `jsv.isEuStrict`

```javascript
function() {
  return {{dlv.consent_profile}} === 'eu_strict';
}
```

### `jsv.transportUrl`

```javascript
function() {
  var base = {{dlv.tagging_server_url}} || '';
  var path = {{dlv.tagging_server_collect_path}} || '/g/collect';
  if (!base) return undefined;
  return base.replace(/\/+$/, '') + (path.charAt(0) === '/' ? path : '/' + path);
}
```

## 2) Web GTM: triggers

Create **Custom Event Trigger**:

- Name: `CE - tm_tagging_config`
- Event name: `tm_tagging_config`

Create **Custom Event Trigger** (for normalized app events):

- Name: `CE - tracked events`
- Event name regex:

```regex
^(AD_LANDING|CTA_CLICK|BOOKING_CLICK|CHECKOUT_START|PHONE_CLICK|EMAIL_CLICK|GIFT_CARD_CLICK|LOCATION_SELECT|TICKET_PANEL_OPEN|TICKET_PANEL_CLOSE|MISSION_CARD_CLICK|CONTACT_FORM_FOCUS|CONTACT_FORM_SUBMIT_ATTEMPT|CONTACT_FORM_SUBMIT_SUCCESS|NAV_CTA_CLICK)$
```

## 3) Web GTM: tags

### Tag A — GA4 Config (web baseline)

- Type: Google tag / GA4 config
- Trigger: All Pages
- Consent checks: enabled
- Do not pass PII fields.

### Tag B — GA4 Event (normalized events)

- Type: GA4 Event
- Event Name: `{{dlv.event_name}}`
- Event Parameters:
  - `event_id` = `{{dlv.event_id}}`
  - `consent_profile` = `{{dlv.parameters.consent_profile}}`
  - `consent_ad_storage` = `{{dlv.parameters.consent.ad_storage}}`
  - `consent_analytics_storage` = `{{dlv.parameters.consent.analytics_storage}}`
  - `consent_ad_user_data` = `{{dlv.parameters.consent.ad_user_data}}`
  - `consent_ad_personalization` = `{{dlv.parameters.consent.ad_personalization}}`
  - Plus mapped keys from `{{dlv.parameters}}` as needed in your GA4 schema
- Trigger: `CE - tracked events`
- Consent checks: enabled

> Keep consent snapshot fields as diagnostic/compliance context in analytics streams. Do not use them to bypass Consent Mode checks.

### Tag C — GA4 Config/Event for sGTM transport (optional)

For tags you want routed through server endpoint:

- Add transport URL field to tag settings:
  - `transport_url` = `{{jsv.transportUrl}}`
- Fire only when `{{jsv.isWebAndSgtm}}` equals `true`.
- Keep consent checks enabled.

> Recommended pattern: keep one baseline GA4 path and one routed path with explicit trigger conditions to avoid accidental duplicates.

## 4) Duplication control in web GTM

- Use one routing strategy per event family (direct web OR routed via sGTM) unless explicitly dual-tracking.
- If dual-tracking temporarily, include deterministic dedupe in downstream pipelines keyed by `event_id`.
- Keep trigger scopes mutually exclusive where possible.

## 5) sGTM container recipe

In server container:

1. Read incoming consent state and event metadata.
2. Use `event_id` as the primary dedupe key.
3. Enforce policy:
   - Denied consent => block marketing destinations.
   - Analytics destinations only when consent policy allows.
4. Preserve `event_name` and normalized params.
5. Add server metadata only (processing time, destination status), never user PII enrichment.

## 6) Regional policy conditions

Use `consent_profile` from `tm_tagging_config` as policy context:

- `eu_strict`: require explicit consent enablement before ad/analytics destinations.
- `us_open`: allow default-granted path but still honor user opt-outs/CMP updates.
- `global_strict`: keep default-deny unless updated.

## 7) QA flow (copy-paste checklist)

- [ ] In GTM Preview, `tm_tagging_config` appears once on load.
- [ ] `consent_profile` matches page type (EU/US/global).
- [ ] `tagging_mode` reflects env configuration.
- [ ] Routed tags only fire when `web_and_sgtm` is active.
- [ ] No duplicate GA4 events for same `event_id` unless intentionally dual-tracking.
- [ ] sGTM receives consent-compatible events only.
- [ ] No PII appears in `dataLayer`, GA4 DebugView, or server logs.

## 8) Common misconfigurations

- Routing all GA4 tags to sGTM without conditional trigger gates.
- Forgetting consent checks on routed tags.
- Mapping free-text link labels into analytics parameters.
- Running overlapping triggers on both routed and non-routed tags.
- Missing dedupe policy downstream when dual-tracking during migration.

## References

- `docs/gtm-operator-runbook.md`
- `docs/cmp-consent-matrix.md`
- `docs/analytics-event-contract.md`
