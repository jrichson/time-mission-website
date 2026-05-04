---
phase: quick-260504-lsk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/locations.ts
  - data/locations.json
  - src/lib/schema/localBusiness.ts
  - scripts/check-schema-output.js
autonomous: true
requirements:
  - P0-5
  - P0-8
must_haves:
  truths:
    - "Antwerp LocalBusiness JSON-LD declares name='Time Mission Antwerp' (canonical brand)"
    - "Antwerp LocalBusiness JSON-LD declares alternateName='Experience Factory Antwerp' (legacy operator brand)"
    - "All 6 open-location LocalBusiness nodes have name starting with 'Time Mission '"
    - "alternateName field is optional — locations without it omit the property entirely from JSON-LD"
    - "npm run verify still passes end-to-end with the rename and new validator assertions"
  artifacts:
    - path: "src/data/locations.ts"
      provides: "LocationRecord type with optional alternateName?: string field"
      contains: "alternateName"
    - path: "data/locations.json"
      provides: "Antwerp record with name='Time Mission Antwerp' and alternateName='Experience Factory Antwerp'"
      contains: "Time Mission Antwerp"
    - path: "src/lib/schema/localBusiness.ts"
      provides: "LocalBusinessNode interface includes alternateName; localBusinessNode() emits it when present"
      contains: "alternateName"
    - path: "scripts/check-schema-output.js"
      provides: "Validator asserts every open location's LocalBusiness node has name starting with 'Time Mission ' and validates alternateName when present"
      contains: "Time Mission "
  key_links:
    - from: "data/locations.json (antwerp.alternateName)"
      to: "src/lib/schema/localBusiness.ts (node.alternateName)"
      via: "LocationRecord type passthrough -> localBusinessNode emit"
      pattern: "alternateName"
    - from: "scripts/check-schema-output.js"
      to: "dist/antwerp.html JSON-LD"
      via: "open-location iteration asserting Time Mission prefix and alternateName shape"
      pattern: "Time Mission "
---

<objective>
Fix Phase 10 P0-5/P0-8: Antwerp's emitted LocalBusiness JSON-LD currently surfaces the legacy operator brand ("Experience Factory Antwerp") as its `name`. This breaks Google Knowledge Panel attribution to the canonical Time Mission brand for the Antwerp URL.

This plan renames Antwerp to "Time Mission Antwerp" in `data/locations.json`, plumbs an optional `alternateName` field through the `LocationRecord` type and `LocalBusinessNode` schema interface, emits `alternateName: "Experience Factory Antwerp"` for Antwerp (preserving legacy brand association per Schema.org best practice), and extends `scripts/check-schema-output.js` to lock the contract in for all 6 open locations.

Purpose: Close the highest-leverage single audit gap (Phase 10 plan 10-01 candidate) before cutover. Establishes the `alternateName` plumbing pattern that future locations can opt into without further schema-emitter changes.

Output: One Antwerp data rename + one new optional schema field + one new validator assertion, all gated by `npm run verify`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/10-audit-gap-closure-cutover-readiness/10-CONTEXT.md
@./CLAUDE.md
@src/data/locations.ts
@src/lib/schema/localBusiness.ts
@data/locations.json
@scripts/check-schema-output.js

<interfaces>
<!-- Key types and contracts the executor needs. Extracted from codebase. -->
<!-- Use these directly. Do not re-explore. -->

From src/data/locations.ts (LocationRecord interface — alternateName must be added here as optional):

```typescript
export interface LocationRecord {
    id: string;
    slug: string;
    name: string;
    shortName: string;
    venueName: string | null;
    region: string;
    status: 'open' | 'coming-soon';
    address: { line1: string; line2?: string; city: string; state: string; zip: string; country: string };
    contact: { phone: string; email: string };
    hours: Record<string, LocationDayHours>;
    bookingUrl: string;
    rollerCheckoutUrl?: string;
    navLabel: string;
    mapUrl: string;
    faqs: unknown[];
    ticker: string;
    giftCardUrl: string;
    countryCode: string | null;
    locale: string | null;
    timeZone: string | null;
    currency: string | null;
    phoneE164: string | null;
    hreflang: Array<{ lang: string; url: string }> | null;
    localBusinessSchemaEligible: boolean;
    // <-- ADD: alternateName?: string;
}
```

From src/lib/schema/localBusiness.ts (LocalBusinessNode interface — alternateName must be added between `name` and `url`):

```typescript
export interface LocalBusinessNode {
    '@type': 'EntertainmentBusiness';
    '@id': string;
    name: string;
    // <-- ADD: alternateName?: string;
    url: string;
    telephone?: string;
    email?: string;
    address: { '@type': 'PostalAddress'; streetAddress: string; addressLocality: string; addressRegion?: string; postalCode: string; addressCountry: string };
    openingHoursSpecification?: Array<{ '@type': 'OpeningHoursSpecification'; dayOfWeek: string; opens: string; closes: string }>;
    sameAs?: string[];
}
```

In `localBusinessNode(loc, canonicalPath)` after the literal constructs `name: loc.name`, add a guarded conditional set:

```typescript
if (typeof loc.alternateName === 'string' && loc.alternateName.trim()) {
    node.alternateName = loc.alternateName;
}
```

Antwerp record location in data/locations.json (lines ~392-461 — current state):

```json
{
  "id": "antwerp",
  "slug": "antwerp",
  "name": "Experience Factory Antwerp",
  "shortName": "Antwerp",
  "venueName": "Experience Factory",
  ...
}
```

Required state after edits:

```json
{
  "id": "antwerp",
  "slug": "antwerp",
  "name": "Time Mission Antwerp",
  "alternateName": "Experience Factory Antwerp",
  "shortName": "Antwerp",
  "venueName": "Experience Factory",
  ...
}
```

Other open locations confirmed already starting with "Time Mission " (no edits needed):
- mount-prospect: "Time Mission Mount Prospect"
- philadelphia: "Time Mission Philadelphia"
- west-nyack: "Time Mission Palisades"
- lincoln: "Time Mission Providence"
- manassas: "Time Mission Manassas"

`scripts/check-schema-output.js` iterates `schemaRoutes` from `routesData.routes` filtered by `SCHEMA_CHECK_OUTPUT_FILES`. The new assertion should run inside that same loop (or a dedicated open-location pass) that finds the EntertainmentBusiness node and checks `name`/`alternateName`. Reference points already in the script: `findOne(graph, 'EntertainmentBusiness')`, `locationsDoc.locations.find((l) => l.slug === 'philadelphia')`. Extend the same pattern to every open location.
</interfaces>

<gitnexus_protocol>
**MANDATORY per CLAUDE.md** — before editing any function/symbol, the executor MUST:

1. Run `gitnexus_impact({target: "localBusinessNode", direction: "upstream"})` and report blast radius (callers, processes, risk level). Stop and warn user if HIGH/CRITICAL is reported.
2. Run `gitnexus_impact({target: "LocationRecord", direction: "upstream"})` because the interface is being extended — same protocol.
3. Run `gitnexus_impact({target: "LocalBusinessNode", direction: "upstream"})` to surface any consumer that destructures the schema interface shape.
4. After all edits, run `gitnexus_detect_changes({scope: "all"})` to verify only the four expected files changed.
5. After commit, the PostToolUse hook should refresh the index automatically. If not, run `npx gitnexus analyze` to keep it fresh.

If GitNexus reports the index is stale at any point, run `npx gitnexus analyze` first.
</gitnexus_protocol>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Extend LocationRecord and LocalBusinessNode types with optional alternateName</name>
  <files>src/data/locations.ts, src/lib/schema/localBusiness.ts</files>
  <action>
Step 1 — GitNexus impact analysis (per CLAUDE.md):
- Run `gitnexus_impact({target: "LocationRecord", direction: "upstream"})` and report blast radius. Adding an OPTIONAL field is structurally additive (low risk), but report findings to the user. Stop and ask if HIGH/CRITICAL is reported.
- Run `gitnexus_impact({target: "localBusinessNode", direction: "upstream"})` and report blast radius. The function signature is unchanged; only the return shape gains an optional property. Report findings.
- Run `gitnexus_impact({target: "LocalBusinessNode", direction: "upstream"})` to surface any consumer that destructures the interface shape.

Step 2 — Edit `src/data/locations.ts`:
- After the `localBusinessSchemaEligible: boolean;` line in the `LocationRecord` interface, add a new line: `alternateName?: string;`
- Keep the field optional (single `?`) — only Antwerp will populate it in this plan; other locations must continue to type-check.
- Do NOT modify `LocationsDocument`, `locationsDocument`, or `allLocations` exports — they remain unchanged.

Step 3 — Edit `src/lib/schema/localBusiness.ts`:
- In the `LocalBusinessNode` interface, between the `name: string;` line and the `url: string;` line, insert: `alternateName?: string;`
- In the `localBusinessNode()` function body, immediately after the `node` object literal is constructed (the closing `};` of the literal currently around line 59), add a guarded conditional assignment:

```typescript
if (typeof loc.alternateName === 'string' && loc.alternateName.trim()) {
    node.alternateName = loc.alternateName;
}
```

- Place this block BEFORE the `addressRegion` conditional, so emitted JSON-LD field order is: `@type`, `@id`, `name`, `alternateName`, `url`, ..., `address`, hours.
- Do NOT change the null-return guards (`status !== 'open'`, `localBusinessSchemaEligible !== true`) or any other emit logic.
- Preserve existing 4-space indentation in this file.

Step 4 — Type-check before moving on:
- Inspect `package.json` first to find the canonical TS check command (look for `tsc`, `astro check`, or similar). If `astro check` exists, prefer that. Otherwise run `npx tsc --noEmit`.
- Build must remain typesafe before any data change in Task 2.
  </action>
  <verify>
    <automated>grep -n "alternateName" src/data/locations.ts src/lib/schema/localBusiness.ts && (npx astro check 2>/dev/null || npx tsc --noEmit) | tail -20</automated>
  </verify>
  <done>
- `LocationRecord` interface has optional `alternateName?: string;` field.
- `LocalBusinessNode` interface has optional `alternateName?: string;` field positioned between `name` and `url`.
- `localBusinessNode()` conditionally sets `node.alternateName = loc.alternateName` when the source value is a non-empty trimmed string; absent/empty values omit the property entirely.
- TypeScript compilation passes (or matches existing baseline if there are pre-existing type errors unrelated to this change — note any baseline noise to the user).
- GitNexus impact analysis was run and any HIGH/CRITICAL findings were reported.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Rename Antwerp record and add alternateName in data/locations.json</name>
  <files>data/locations.json</files>
  <action>
Step 1 — Locate the Antwerp record (id "antwerp", currently at lines ~392-461). Apply two surgical edits:

Edit A — change the `name` value:
- From: `"name": "Experience Factory Antwerp",`
- To:   `"name": "Time Mission Antwerp",`

Edit B — insert the `alternateName` field as a sibling of `name`:
- After the (newly renamed) `"name": "Time Mission Antwerp",` line, insert a new line containing:
  `      "alternateName": "Experience Factory Antwerp",`
- Match the existing 6-space indentation used for sibling fields like `shortName`, `venueName`.

Step 2 — DO NOT modify any other field on Antwerp:
- Keep `shortName: "Antwerp"`, `venueName: "Experience Factory"`, `contact.email: "info@experience-factory.com"`, `bookingUrl` (mailto), `giftCardUrl` (mailto), and all other Antwerp fields unchanged. The `venueName` and contact email correctly reflect the legacy operator that physically runs the Antwerp venue — this is intentional and outside scope.

Step 3 — DO NOT touch any other location's `name` field:
- Other 5 open locations (Mount Prospect, Philadelphia, West Nyack/Palisades, Lincoln/Providence, Manassas) already start with "Time Mission ". West Nyack is "Time Mission Palisades" and Lincoln is "Time Mission Providence" — both still satisfy `name.startsWith('Time Mission ')` and need no edits.

Step 4 — Validate the JSON parses and the existing location-contract validator still passes:
- The verify block runs the existing `node scripts/check-location-contracts.js` validator. Since `alternateName` is not part of its schema, the validator should be tolerant (it checks required-field presence and slug/id consistency, not unknown fields). If the validator rejects unknown fields, EXTEND the schema there in this same task to accept optional `alternateName: string` — do not block on this.
  </action>
  <verify>
    <automated>node -e "const d=require('./data/locations.json'); const a=d.locations.find(l=>l.id==='antwerp'); if(a.name!=='Time Mission Antwerp')throw new Error('antwerp.name='+a.name); if(a.alternateName!=='Experience Factory Antwerp')throw new Error('antwerp.alternateName='+a.alternateName); const open=d.locations.filter(l=>l.status==='open'); for(const l of open){if(!l.name.startsWith('Time Mission '))throw new Error(l.id+' name='+l.name);} console.log('OK '+open.length+' open locations have Time Mission prefix');" && node scripts/check-location-contracts.js</automated>
  </verify>
  <done>
- Antwerp record has `"name": "Time Mission Antwerp"` and `"alternateName": "Experience Factory Antwerp"` as siblings.
- All 6 open locations have `name` starting with `Time Mission ` (verified by inline node script).
- `scripts/check-location-contracts.js` exits 0 — no contract regression.
- No other location records were modified (verified by `git diff data/locations.json` showing only the Antwerp record changed).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Extend check-schema-output.js with all-open-locations brand assertions, then run npm run verify</name>
  <files>scripts/check-schema-output.js</files>
  <action>
Step 1 — Open `scripts/check-schema-output.js` and study the existing structure:
- The script already iterates `schemaRoutes` (Astro-rendered routes that should contain JSON-LD) and uses `findOne(graph, 'EntertainmentBusiness')` for the Philadelphia path.
- For each route whose `canonicalPath` matches an open location's slug (i.e., the route serves a location page that should emit a LocalBusiness node), the script should now assert:
  1. `name` exists and is a non-empty string
  2. `name.startsWith('Time Mission ')` is true
  3. If `alternateName` is present, it must be a non-empty string

Step 2 — Implement the new assertion. Add this logic INSIDE the existing `for (const route of schemaRoutes)` loop, after the existing per-cp branches (or as a new shared branch keyed off open-location slugs):

```javascript
const openLocationSlugs = locationsDoc.locations
  .filter((l) => l.status === 'open' && l.localBusinessSchemaEligible === true)
  .map((l) => l.slug);

if (openLocationSlugs.includes(cp.replace(/^\//, ''))) {
  const slug = cp.replace(/^\//, '');
  const sourceLoc = locationsDoc.locations.find((l) => l.slug === slug);
  const biz = findOne(graph, 'EntertainmentBusiness');
  if (biz.length !== 1) {
    errors.push(`${outFile}: expected one EntertainmentBusiness for open location ${slug}`);
  } else {
    const b = biz[0];
    if (typeof b.name !== 'string' || !b.name.trim()) {
      errors.push(`${outFile}: EntertainmentBusiness.name missing or empty for ${slug}`);
    } else if (!b.name.startsWith('Time Mission ')) {
      errors.push(`${outFile}: EntertainmentBusiness.name '${b.name}' must start with 'Time Mission ' (slug=${slug})`);
    }
    if ('alternateName' in b) {
      if (typeof b.alternateName !== 'string' || !b.alternateName.trim()) {
        errors.push(`${outFile}: EntertainmentBusiness.alternateName present but not a non-empty string (slug=${slug})`);
      }
    }
    // Cross-check: if source data declares alternateName, emitted JSON-LD must match
    if (sourceLoc && typeof sourceLoc.alternateName === 'string' && sourceLoc.alternateName.trim()) {
      if (b.alternateName !== sourceLoc.alternateName) {
        errors.push(`${outFile}: alternateName drift — emitted='${b.alternateName}' source='${sourceLoc.alternateName}' (slug=${slug})`);
      }
    }
  }
}
```

Step 3 — Important placement detail: the existing `cp === '/philadelphia'` branch already does some EntertainmentBusiness checks. Do NOT duplicate those address/hours assertions. The new block should be ADDITIVE — it asserts brand-name properties only. Place the new block AFTER the `if (cp === '/philadelphia')` and `if (cp === '/houston')` branches so it runs as a generalized open-location pass.

Step 4 — Run the full verify chain:
- `npm run check` — runs all source-side checks including `check-location-contracts.js`.
- `npm run build` (or whatever produces `dist/`) — ensures Astro emits the updated schema.
- `node scripts/check-schema-output.js` — directly runs the new assertions against `dist/`.
- `npm run verify` — full end-to-end gate.

If `npm run build` is not the right Astro build script, inspect `package.json` and use the documented build command. If `dist/` already contains stale output from before the data change, rebuild before running `check-schema-output.js`.

Step 5 — Self-check (per CLAUDE.md):
- Run `gitnexus_detect_changes({scope: "all"})` to verify only the four files in `files_modified` changed.
- Report blast radius and detect_changes findings to the user before considering the task complete.
  </action>
  <verify>
    <automated>npm run check && npm run build 2>&1 | tail -5 && node scripts/check-schema-output.js && npm run verify 2>&1 | tail -20</automated>
  </verify>
  <done>
- `scripts/check-schema-output.js` contains a new generalized open-location pass that asserts `name.startsWith('Time Mission ')` and validates `alternateName` shape and source-vs-emitted drift.
- `npm run check` exits 0 (source-side validators all pass).
- `npm run build` (Astro build) produces a fresh `dist/` reflecting the renamed Antwerp record.
- `node scripts/check-schema-output.js` exits 0 — Antwerp's `dist/antwerp.html` JSON-LD has `"name": "Time Mission Antwerp"` and `"alternateName": "Experience Factory Antwerp"`; all 5 other open-location pages have `name` starting with "Time Mission ".
- `npm run verify` exits 0 — full cutover gate still green.
- `gitnexus_detect_changes` shows exactly 4 modified files (the ones listed in `files_modified`); no scope creep.
  </done>
</task>

</tasks>

<verification>
- `npm run check` passes (source-side: location contracts, sitemap, components, booking architecture, accessibility baseline, internal links).
- `npm run build` succeeds (Astro emits fresh `dist/` with renamed Antwerp brand).
- `node scripts/check-schema-output.js` passes the new open-location brand assertions.
- `npm run verify` passes the full cutover gate.
- Manual spot check: open `dist/antwerp.html`, locate the `application/ld+json` block containing `EntertainmentBusiness`, confirm `"name": "Time Mission Antwerp"` and `"alternateName": "Experience Factory Antwerp"` are both present in the JSON-LD output.
- `git diff --stat` shows only the four files in `files_modified` changed; no unrelated edits.
- `gitnexus_detect_changes({scope: "all"})` confirms scope.
</verification>

<success_criteria>
1. Antwerp's emitted LocalBusiness JSON-LD declares `name="Time Mission Antwerp"` and `alternateName="Experience Factory Antwerp"`.
2. The other 5 open-location LocalBusiness nodes still declare `name` starting with "Time Mission " and DO NOT emit an `alternateName` property (no opt-in, no emit).
3. `LocationRecord` and `LocalBusinessNode` TypeScript interfaces both expose optional `alternateName?: string`.
4. `scripts/check-schema-output.js` permanently locks the contract: any future regression where an open location's `name` does not start with "Time Mission ", or where source `alternateName` drifts from emitted JSON-LD, breaks `npm run verify`.
5. `npm run verify` exits 0 end-to-end.
6. No other location data, no other source files, and no unrelated tests are touched.
7. GitNexus impact and detect_changes were run as required by `./CLAUDE.md`.
</success_criteria>

<output>
After completion, create `.planning/quick/260504-lsk-fix-p0-5-p0-8-rename-antwerp-location-to/260504-lsk-SUMMARY.md` capturing:
- Files modified (the four declared in `files_modified`).
- GitNexus impact findings for `localBusinessNode`, `LocationRecord`, `LocalBusinessNode` (callers, risk level).
- Confirmation that `npm run verify` passed.
- The exact emitted JSON-LD `name` and `alternateName` snippet from `dist/antwerp.html`.
- Note for Phase 10 plan 10-01: this quick plan ships the `alternateName` plumbing and brand-prefix assertion. Phase 10 plan 10-01 may now drop those line items and focus on host-config, redirects, or any audit findings still open.
</output>
