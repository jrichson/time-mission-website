# Houston and Philadelphia Jotform Reactivation

Houston and Philadelphia group inquiries are temporarily routed to their previous Roller forms while the separate franchisee Pipedrive setup is completed. The Jotform implementation is intentionally retained and should be reactivated with a new forward-only change.

## Preserved implementation

- Enabling commit: `7e16967347520f5566ecc173b987306bfcff57f8`
- Jotform configuration: `src/lib/group-form-context.ts`
- Shared form renderer: `src/components/GroupInquiryForm.astro`
- Submit behavior: `js/group-inquiry-form.js`
- Original enabling migration: `cms/migrations/20260810_090000_houston_philadelphia_jotform_routes.ts`
- Temporary Roller migration: `cms/migrations/20260810_170000_houston_philadelphia_roller_routes.ts`
- Reusable route and Roller URL snapshot: `cms/migration-data/20260810_houston_philadelphia_jotform_routes_snapshot.ts`

Do not delete or edit the applied migration history. The temporary migration's `down` function documents the exact reversal, but production reactivation should normally use a new forward migration that writes the preserved on-site routes.

## Preserved CRM values

| Location | Jotform | Pipedrive location | Deal prefix |
| --- | --- | --- | --- |
| Houston | `262186150244149` | `Houston` | `HOU` |
| Philadelphia | `262217710699160` | `Philadelphia` | `PHL` |

The website continues to retain mappings for `q20_dealTitle`, `q21_location`, `q23_typeA`, and the existing event-detail field.

## Readiness gate

Before reactivation, submit one controlled test through each franchisee-owned Jotform and confirm:

1. One Pipedrive person is created or matched without an unwanted duplicate.
2. One deal is created in the correct location pipeline, stage, status, visibility, and owner.
3. The deal title begins with `HOU:` or `PHL:` as appropriate.
4. The Pipedrive location equals `Houston` or `Philadelphia` exactly.
5. Event Details reaches the intended Deal Large text field without a 255-character rejection.
6. Expected activities and notifications are created once.
7. The Jotform success redirect reaches the Time Mission thank-you route and emits `GROUP_FORM_SUBMIT_SUCCESS` without PII.

## Reactivation change

1. In `data/locations.json`, set all seven `groupFormUrls` values for each location to:
   - Houston: `/groups/inquire/houston/{form_key}`
   - Philadelphia: `/groups/inquire/philadelphia/{form_key}`
2. Add a new CMS migration after `20260810_170000_houston_philadelphia_roller_routes`. Reuse `HOUSTON_PHILADELPHIA_JOTFORM_ROUTES_SNAPSHOT` and write each entry's `groupFormUrls` value, matching the temporary migration's `down` behavior.
3. Update routing tests and the active-state notes in the analytics contract, CTA matrix, and GTM runbook.
4. Run `npm run check`, `npm run build:astro`, and `npm run test:smoke`.
5. Deploy a clean US artifact, then no-cache verify Houston, Philadelphia, Manassas, Mount Prospect, and Orland Park.

The seven form keys are `default`, `birthdays`, `corporate`, `field-trips`, `bachelor-ette`, `private-events`, and `holidays`.
