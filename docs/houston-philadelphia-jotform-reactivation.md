# Houston and Philadelphia Jotform Reactivation

Houston and Philadelphia group inquiries now use the same on-site design as Manassas and Mount Prospect while submitting to their separate franchisee-owned Jotform accounts. The previous Roller rollback remains in migration history, and reactivation is implemented as a new forward-only change.

## Preserved implementation

- Enabling commit: `7e16967347520f5566ecc173b987306bfcff57f8`
- Jotform configuration: `src/lib/group-form-context.ts`
- Shared form renderer: `src/components/GroupInquiryForm.astro`
- Submit behavior: `js/group-inquiry-form.js`
- Original enabling migration: `cms/migrations/20260810_090000_houston_philadelphia_jotform_routes.ts`
- Temporary Roller migration: `cms/migrations/20260810_170000_houston_philadelphia_roller_routes.ts`
- Forward reactivation migration: `cms/migrations/20260901_090000_houston_philadelphia_jotform_reactivation.ts`
- Reusable route and Roller URL snapshot: `cms/migration-data/20260810_houston_philadelphia_jotform_routes_snapshot.ts`

Do not delete or edit the applied migration history. The forward migration writes the preserved on-site routes; its `down` function restores the prior Roller destinations.

## Preserved CRM values

| Location | Jotform | Build metadata | Pipedrive location | Deal prefix |
| --- | --- | --- | --- | --- |
| Houston | `262186150244149` | `1788292905464` | `Houston` | `HOU` |
| Philadelphia | `262217710699160` | `1788292891937` | `Philadelphia` | `PHI` |

The website continues to retain mappings for `q20_dealTitle`, `q21_location`, `q23_typeA`, and the existing event-detail field.

## Production release gate

Before deploying the reactivation, submit one controlled test through each franchisee-owned Jotform and confirm:

1. One Pipedrive person is created or matched without an unwanted duplicate.
2. One deal is created in the correct location pipeline, stage, status, visibility, and owner.
3. The deal title begins with `HOU:` or `PHI:` as appropriate.
4. The Pipedrive location equals `Houston` or `Philadelphia` exactly.
5. Event Details reaches the intended Deal Large text field without a 255-character rejection.
6. Expected activities and notifications are created once.
7. The Jotform success redirect reaches the Time Mission thank-you route and emits `GROUP_FORM_SUBMIT_SUCCESS` without PII.

## Implemented reactivation

1. `data/locations.json` sets all seven `groupFormUrls` values for each location to:
   - Houston: `/groups/inquire/houston/{form_key}`
   - Philadelphia: `/groups/inquire/philadelphia/{form_key}`
2. `20260901_090000_houston_philadelphia_jotform_reactivation` reuses `HOUSTON_PHILADELPHIA_JOTFORM_ROUTES_SNAPSHOT` and writes each entry's on-site route.
3. The shared renderer preserves each source form's field names, form ID, build metadata, CRM location, and deal prefix. Houston and Philadelphia do not render the optional Group Specialist phone callout.
4. Release validation remains `npm run check`, `npm run build:astro`, and `npm run test:smoke`.
5. After deployment, no-cache verify Houston, Philadelphia, Manassas, Mount Prospect, and Orland Park.

The seven form keys are `default`, `birthdays`, `corporate`, `field-trips`, `bachelor-ette`, `private-events`, and `holidays`.
