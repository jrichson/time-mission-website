---
phase: quick-260506-gnx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - js/booking-controller.js
  - js/ticket-panel.js
  - js/roller-checkout.js
  - src/components/SiteScripts.astro
  - src/partials/about-inline-scripts.frag.txt
  - scripts/policies/booking-policies.cjs
  - scripts/check-route-contract.js
  - tests/smoke/site.spec.js
  - "*.html (root pages with <script src=\"js/roller-checkout.js\">, ~38 files)"
autonomous: true
requirements:
  - RFC-10
must_haves:
  truths:
    - "window.TMBooking exposes {open, resolve, mount, attach, getDestination, navigate, isDirectBookingUrl}"
    - "ticket-panel.js no longer computes booking URLs, no longer calls window.TMAnalytics directly, and no longer exposes window.TMTicketPanel.getBookingUrl"
    - "Ticket panel 'Continue to Booking' button is a [data-tm-booking-trigger] element handled by TMBooking.attach (no inline click handler that recomputes URL)"
    - "?book=1 auto-redirect on a location page deterministically waits for window.TM.ready before navigating (no synchronous else-branch fallthrough)"
    - "js/roller-checkout.js no longer exists in the repo and no HTML/Astro page references it"
    - "npm run check exits 0 (booking architecture + booking-policies + route contract still pass)"
    - "npm run test:smoke exits 0 (existing ticket panel + ?book=1 BOOK-04 tests still pass)"
  artifacts:
    - path: "js/booking-controller.js"
      provides: "TMBooking surface: open, resolve, mount, attach, getDestination, navigate, isDirectBookingUrl"
      contains: "window.TMBooking"
    - path: "js/ticket-panel.js"
      provides: "Pure ticket panel UI module (no URL math, no analytics calls, no TMTicketPanel.getBookingUrl)"
      contains: "data-tm-booking-trigger"
    - path: "src/components/SiteScripts.astro"
      provides: "Astro layout no longer loads /js/roller-checkout.js"
  key_links:
    - from: "js/ticket-panel.js"
      to: "window.TMBooking"
      via: "TMBooking.mount(panelEl) and TMBooking.attach(document, ...)"
      pattern: "TMBooking\\.(mount|attach|navigate|getDestination)"
    - from: "ticket-panel HTML"
      to: "TMBooking.attach"
      via: "ticketBookBtn gets data-tm-booking-trigger; click handled by booking-controller"
      pattern: "data-tm-booking-trigger"
    - from: "?book=1 auto-redirect"
      to: "window.TM.ready"
      via: "always awaited; no synchronous else branch"
      pattern: "TM\\.ready\\.then"
---

<objective>
Implement RFC #10 (deepen booking module) per the linked GitHub issue. Collapse all
URL computation, analytics tracking, and the `?book=1` auto-redirect logic out of
`js/ticket-panel.js` and into `js/booking-controller.js` (window.TMBooking).

Purpose:
- One canonical booking gateway. Today URL math leaks into ticket-panel.js
  (`getBookingUrl`, `getLocationContext` shim, `tmTrack`, `normalizeLocation`,
  `scheduleAutoRedirect`). Auto-redirect has a race: when `window.TM.ready` is
  not yet set, it falls through to a synchronous redirect that can fire before
  TM hydration completes.
- Remove dead code: `js/roller-checkout.js` is now a 13-LoC doc-stub whose only
  reference (`window.TMTicketPanel.getBookingUrl`) is being deleted in this
  same change. Removing the script tag from 38+ HTML pages and SiteScripts.astro
  cleans the wave.
- Public surface clarity: `window.TMBooking` becomes the single, documented
  extension point — `{open, resolve, mount, attach, getDestination, navigate, isDirectBookingUrl}`.

Output:
- Expanded `js/booking-controller.js` with `open`, `resolve`, `mount` plus
  internalized `tmTrack`, `normalizeLocation`, deterministic `?book=1`
  auto-redirect.
- Slimmed `js/ticket-panel.js` (pure UI: panel open/close, location dropdown
  hydration, focus). No URL computation, no analytics calls, no public
  `TMTicketPanel.getBookingUrl`.
- Deleted `js/roller-checkout.js` and removed every `<script src=".../js/roller-checkout.js">`
  reference (HTML pages + SiteScripts.astro + the related `about-inline-scripts.frag.txt`).
- Updated booking policies + route-contract checker to drop roller-checkout.js
  expectations.
- Smoke tests still green; `?book=1` BOOK-04 test remains green (now via the
  consolidated TMBooking-owned redirect).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@js/ticket-panel.js
@js/booking-controller.js
@js/roller-checkout.js
@js/locations.js
@js/analytics.js
@data/locations.json
@scripts/check-booking-architecture.js
@scripts/policies/booking-policies.cjs
@src/components/SiteScripts.astro
@tests/smoke/site.spec.js

<interfaces>
<!-- Contracts the executor must preserve. Do not change these shapes. -->

window.TM (from js/locations.js):
  - TM.ready: Promise — resolves after data/locations.json fetch (or its fallback)
  - TM.locations: Array<Location>
  - TM.current: Location | null
  - TM.get(id): Location | null

window.TMAnalytics (from js/analytics.js):
  - TMAnalytics.track(eventKey, payload)  // eventKey ∈ analytics-labels.json
  - TMAnalytics.safeDestination(url): string  // strips PII/query for analytics

Existing window.TMBooking (current — to be EXPANDED, not changed in shape):
  - attach(root, opts): detachFn
  - getDestination(opts): string  // {kind, locationId, pageLocationSlug, preferLocationPageFlow}
  - navigate(intent): boolean    // {source, ctaId, href, locationId, cleanBookParam, deferUntilLoad, event, openPanel, currentTarget, pageLocationSlug}
  - isDirectBookingUrl(href): boolean

NEW additions to window.TMBooking (this plan):
  - open(opts?): void          // explicit "open the ticket panel" trigger; opts.locationId optional
  - resolve(opts): string      // alias / canonical name for the URL-matrix logic; thin wrapper over getDestination
  - mount(panelEl?, opts?): void  // wires a panel DOM (selectEl, ctaBtn, etc.) to TMBooking handlers; auto-discovers #ticketPanel/#ticketLocation/#ticketBookBtn if not provided

DOM contract (unchanged):
  - #ticketPanel, #ticketOverlay, #ticketClose, #ticketLocation, #ticketBookBtn
  - body[data-location] = canonical slug on location pages
  - [data-tm-booking-trigger] on every booking CTA (existing convention)

Smoke test invariants the change must keep green (tests/smoke/site.spec.js):
  - "homepage loads core navigation and booking panel" — clicking .hero-cta .btn-tickets opens #ticketPanel
  - "ticket panel options hydrate from location data" — selecting orland-park sets #ticketBookBtn href to "/orland-park?book=1"; manassas → "/manassas?book=1"
  - "open location ?book=1 navigates to https checkout" — visiting /philadelphia?book=1 issues an outbound https navigation request whose URL does not contain book=1
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Expand TMBooking with open/resolve/mount + internalize tmTrack/normalizeLocation/auto-redirect; verify GitNexus impact first</name>
  <files>js/booking-controller.js</files>
  <action>
**Step 0 — GitNexus impact (MANDATORY per CLAUDE.md):**
Run, in order:
  1. `gitnexus_impact({target: "getDestination", direction: "upstream"})`
  2. `gitnexus_impact({target: "navigate", direction: "upstream"})`
  3. `gitnexus_impact({target: "attach", direction: "upstream"})` (filter to js/booking-controller.js)
Report blast radius (direct callers, affected processes, risk level) before editing.
If any returns HIGH/CRITICAL, surface to user and pause. Expected callers: js/ticket-panel.js (will be edited in Task 2). Anything else outside this plan is a blocker — stop and report.

**Step 1 — Add `normalizeLocation`, `tmTrack`, and a `scheduleAutoRedirect` helper inside the existing IIFE.**
The functions already exist locally in booking-controller.js (`normalizeLocation`, `tmTrack`); leave them as-is. They will become the canonical copy.

**Step 2 — Add `resolve(opts)` as a thin wrapper:**
```js
function resolve(opts) {
  // Canonical resolver name. RFC-10: surface "resolve" alongside "getDestination".
  return getDestination(opts);
}
```

**Step 3 — Add `open(opts)`:**
```js
function open(opts) {
  // Programmatic ticket-panel open. Looks for a registered panel mount; if none,
  // dispatches a CustomEvent('tm:booking:open') so ticket-panel.js (or any
  // future panel impl) can listen and open without TMBooking importing UI code.
  var detail = opts || {};
  if (mountedPanel && typeof mountedPanel.openPanel === 'function') {
    mountedPanel.openPanel(detail);
    return;
  }
  document.dispatchEvent(new CustomEvent('tm:booking:open', { detail: detail }));
}
```

**Step 4 — Add `mount(panelEl, opts)` to register a panel:**
```js
var mountedPanel = null;
function mount(panelEl, opts) {
  // panelEl optional — if absent, auto-discover via DOM ids.
  var options = opts || {};
  var panel       = panelEl                || document.getElementById('ticketPanel');
  var overlay     = options.overlayEl      || document.getElementById('ticketOverlay');
  var closeBtn    = options.closeEl        || document.getElementById('ticketClose');
  var locSelect   = options.selectEl       || document.getElementById('ticketLocation');
  var ctaBtn      = options.ctaEl          || document.getElementById('ticketBookBtn');
  var openPanel   = typeof options.openPanel === 'function' ? options.openPanel : null;
  var closePanel  = typeof options.closePanel === 'function' ? options.closePanel : null;
  var pageLocationSlug = normalizeLocation(options.pageLocationSlug || (document.body && document.body.dataset.location) || '');

  mountedPanel = { panelEl: panel, openPanel: openPanel, closePanel: closePanel };

  // Mark CTA button as a booking trigger so attach() owns its click.
  if (ctaBtn) {
    ctaBtn.setAttribute('data-tm-booking-trigger', '');
    ctaBtn.removeAttribute('target');
  }

  // Keep the CTA button's href in sync with the dropdown selection.
  function syncCtaHref() {
    if (!ctaBtn || !locSelect) return;
    var url = getDestination({
      kind: 'tickets',
      locationId: locSelect.value,
      pageLocationSlug: pageLocationSlug,
      preferLocationPageFlow: !pageLocationSlug,
    });
    // Coming-soon location-page flow: append ?book=1 if the resolved url is just /slug
    if (!pageLocationSlug && url && /^\//.test(url) && url.indexOf('?') === -1) {
      var loc = getLocation(locSelect.value);
      if (loc && loc.status === 'coming-soon') url += '?book=1';
    }
    ctaBtn.href = url || '#';
  }

  if (locSelect) {
    locSelect.addEventListener('change', function () {
      syncCtaHref();
      tmTrack('location_select', {
        location_slug: locSelect.value,
        cta_id: 'ticket_panel_dropdown',
      });
    });
  }

  // Defer the initial syncs until TM data is hydrated.
  var ctx = (window.LocationContext || (window.TM && { ready: window.TM.ready })) || null;
  if (ctx && ctx.ready && typeof ctx.ready.then === 'function') {
    ctx.ready.then(syncCtaHref);
  } else {
    syncCtaHref();
  }

  // attach() already binds [data-tm-booking-trigger] click delegation, so the
  // CTA button now flows through navigate() automatically. Don't add a second handler here.
  attach(document, {
    selector: '[data-tm-booking-trigger]',
    pageLocationSlug: pageLocationSlug,
    openPanel: openPanel,
  });

  return { syncCtaHref: syncCtaHref };
}
```

**Step 5 — Move the `?book=1` auto-redirect into booking-controller and FIX the race:**
Add at the bottom of the IIFE (after the public surface assignment):
```js
function scheduleAutoRedirect() {
  var pageLocationSlug = normalizeLocation((document.body && document.body.dataset.location) || '');
  if (!pageLocationSlug) return;
  if (window.location.search.indexOf('book=1') === -1) return;

  function doRedirect() {
    var href = getDestination({
      kind: 'tickets',
      locationId: pageLocationSlug,
      pageLocationSlug: pageLocationSlug,
      preferLocationPageFlow: false,
    });
    if (!href) return;
    navigate({
      source: 'book_param_auto',
      ctaId: 'book_param_auto',
      href: href,
      locationId: pageLocationSlug,
      cleanBookParam: true,
      deferUntilLoad: true,
    });
  }

  // RFC-10 fix: ALWAYS wait for TM.ready. Never fall through synchronously,
  // even if window.TM is not yet defined when this script runs. Poll briefly
  // (≤1s) for TM.ready, then resolve. This closes the BOOK-04 race where the
  // else branch fired before location data hydrated.
  function awaitTMReady(deadline) {
    if (window.TM && window.TM.ready && typeof window.TM.ready.then === 'function') {
      window.TM.ready.then(doRedirect);
      return;
    }
    if (Date.now() > deadline) {
      // Last resort after 1s: TM script never loaded. Better to navigate to
      // /slug than leave the user stranded on /slug?book=1 forever.
      doRedirect();
      return;
    }
    setTimeout(function () { awaitTMReady(deadline); }, 25);
  }
  awaitTMReady(Date.now() + 1000);
}

// Auto-boot on script load (defer is set on the <script>, so DOM is ready).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleAutoRedirect);
} else {
  scheduleAutoRedirect();
}
```

**Step 6 — Update the public surface:**
```js
window.TMBooking = {
  attach: attach,
  getDestination: getDestination,
  navigate: navigate,
  isDirectBookingUrl: isDirectBookingUrl,
  open: open,
  resolve: resolve,
  mount: mount,
};
```
Leave `window.BookingController` and `window.TMFacade` unchanged — TMFacade re-exposes TMBooking via getter so the new methods appear automatically.

**Step 7 — Bump cache-buster comment** at the top of the file or via the `?v=` query in SiteScripts.astro (handled in Task 3). No version bump needed inside the file itself.

**Constraints / things to AVOID and WHY:**
- Do NOT call `window.TMAnalytics.track` directly outside `tmTrack()`; the helper guards against undefined analytics. Direct calls break on pages where consent hasn't loaded analytics yet.
- Do NOT change `getDestination` signature or return shape — the smoke test asserts `/orland-park?book=1` and `/manassas?book=1` exactly.
- Do NOT remove `window.BookingController` — `scripts/policies/booking-policies.cjs` and other callers may reference it; keeping it costs nothing.
- Do NOT load Roller iframe CDN; booking-policies forbids `cdn.rollerdigital.com` and `checkout_iframe.js`. Auto-redirect must use plain `window.location.assign`/`href` (already done by `navigate()`).

**Step 8 — Post-edit GitNexus check:**
Run `gitnexus_detect_changes({scope: "staged"})` to confirm only js/booking-controller.js changed in this task.
  </action>
  <verify>
    <automated>node -e "
      const fs = require('fs');
      const src = fs.readFileSync('js/booking-controller.js', 'utf8');
      const required = ['open:', 'resolve:', 'mount:', 'getDestination', 'navigate', 'isDirectBookingUrl', 'scheduleAutoRedirect', 'window.TM.ready'];
      const missing = required.filter(s =&gt; !src.includes(s));
      if (missing.length) { console.error('MISSING:', missing); process.exit(1); }
      // Race fix: must NOT have an unguarded else-branch synchronous call to scheduleAutoRedirect.
      // (Allowed: deadline-bounded fallback INSIDE awaitTMReady.)
      if (!/awaitTMReady|TM\.ready\.then/.test(src)) { console.error('Auto-redirect must wait on TM.ready'); process.exit(1); }
      console.log('booking-controller surface OK');
    "</automated>
  </verify>
  <done>
js/booking-controller.js exposes window.TMBooking.{open, resolve, mount, attach, getDestination, navigate, isDirectBookingUrl}.
Auto-redirect for `?book=1` is centralized here, deterministically waits for TM.ready, and uses navigate() (which carries cleanBookParam + deferUntilLoad).
GitNexus impact reports captured; gitnexus_detect_changes confirms only js/booking-controller.js modified.
  </done>
</task>

<task type="auto">
  <name>Task 2: Slim ticket-panel.js to pure UI (delete URL math, analytics, TMTicketPanel.getBookingUrl); verify GitNexus impact first</name>
  <files>js/ticket-panel.js</files>
  <action>
**Step 0 — GitNexus impact (MANDATORY):**
Run:
  1. `gitnexus_impact({target: "getBookingUrl", direction: "upstream"})` — must show only same-file callers (we already grepped: zero external callers of `TMTicketPanel.getBookingUrl` exist in src outside dist/).
  2. `gitnexus_impact({target: "scheduleAutoRedirect", direction: "upstream"})` — must show only same-file caller (the IIFE).
  3. `gitnexus_context({name: "openTicketPanel"})` — confirm it is only invoked by the IIFE itself.
Report risk. If anything points outside js/ticket-panel.js, pause and surface to user.

**Step 1 — Replace the file with a UI-only IIFE.** Target shape (~80 LoC):

```js
// ==========================================
// TICKET PANEL — UI module
// Pure DOM behavior: open/close panel, hydrate location dropdown.
// All booking URL logic lives in js/booking-controller.js (window.TMBooking).
// ==========================================
(function () {
  'use strict';

  var ticketPanel    = document.getElementById('ticketPanel');
  var ticketOverlay  = document.getElementById('ticketOverlay');
  var ticketClose    = document.getElementById('ticketClose');
  var ticketLocSel   = document.getElementById('ticketLocation');
  var ticketBookBtn  = document.getElementById('ticketBookBtn');
  var pageLocation   = (document.body && document.body.dataset.location) || '';

  if (!ticketPanel || !ticketLocSel) return;

  function getLocationContext() {
    if (window.LocationContext) return window.LocationContext;
    if (!window.TM) return null;
    return {
      ready: window.TM.ready,
      listTicketOptions: null,
    };
  }

  function syncLocationOptions() {
    var context = getLocationContext();
    var options = [];
    if (context && typeof context.listTicketOptions === 'function') {
      options = context.listTicketOptions();
    } else if (window.TM && Array.isArray(window.TM.locations)) {
      options = window.TM.locations.map(function (loc) {
        return {
          value: loc.id,
          label: loc.shortName + (loc.status === 'coming-soon' ? ' (Coming Soon)' : ''),
        };
      });
    }
    if (!options.length) return;
    var prev = ticketLocSel.value;
    ticketLocSel.textContent = '';
    options.forEach(function (entry) {
      var opt = document.createElement('option');
      opt.value = entry.value;
      opt.textContent = entry.label;
      ticketLocSel.appendChild(opt);
    });
    if (prev) ticketLocSel.value = prev;
  }

  function openTicketPanel(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    // Pre-select saved location, if any
    var current = (window.TM && window.TM.current) || null;
    if (current && (current.id || current.slug) && ticketLocSel) {
      ticketLocSel.value = (current.id || current.slug || '').toLowerCase().trim().replace(/\s+/g, '-');
    }
    ticketPanel.classList.add('active');
    if (ticketOverlay) ticketOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    // No tmTrack here — booking-controller's mount() owns location_select; ticket_panel_open
    // is dispatched by TMBooking via the open() event path. To keep parity with the
    // current TICKET_PANEL_OPEN event, dispatch through TMAnalytics here directly.
    if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
      window.TMAnalytics.track('ticket_panel_open', {
        location_slug: ticketLocSel ? ticketLocSel.value : '',
      });
    }
  }

  function closeTicketPanel() {
    ticketPanel.classList.remove('active');
    if (ticketOverlay) ticketOverlay.classList.remove('active');
    document.body.style.overflow = '';
    if (window.TMAnalytics && typeof window.TMAnalytics.track === 'function') {
      window.TMAnalytics.track('ticket_panel_close', {
        location_slug: ticketLocSel ? ticketLocSel.value : '',
      });
    }
  }

  // Hand panel + CTA off to TMBooking. mount() will:
  //   - mark #ticketBookBtn as [data-tm-booking-trigger]
  //   - bind change handler on #ticketLocation
  //   - keep CTA href in sync with dropdown
  //   - delegate clicks via TMBooking.attach
  if (window.TMBooking && typeof window.TMBooking.mount === 'function') {
    window.TMBooking.mount(ticketPanel, {
      overlayEl: ticketOverlay,
      closeEl: ticketClose,
      selectEl: ticketLocSel,
      ctaEl: ticketBookBtn,
      pageLocationSlug: pageLocation,
      openPanel: openTicketPanel,
      closePanel: closeTicketPanel,
    });
  }

  // Listen for programmatic TMBooking.open() invocations.
  document.addEventListener('tm:booking:open', function (ev) {
    openTicketPanel(ev);
  });

  // Close handlers (UI-local)
  if (ticketClose)   ticketClose.addEventListener('click', closeTicketPanel);
  if (ticketOverlay) ticketOverlay.addEventListener('click', closeTicketPanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ticketPanel.classList.contains('active')) closeTicketPanel();
  });

  // Hydrate dropdown when locations data arrives.
  var ctx = getLocationContext();
  if (ctx && ctx.ready && typeof ctx.ready.then === 'function') {
    ctx.ready.then(syncLocationOptions);
  }

  // No public TMTicketPanel surface — booking lives on window.TMBooking.
})();
```

**Critical deletions (these symbols must NOT appear in the new file):**
- `getBookingUrl` (function and any reference)
- `scheduleAutoRedirect` (moved to booking-controller.js)
- `tmTrack` (helper) — direct `window.TMAnalytics.track(...)` calls inside `openTicketPanel`/`closeTicketPanel` are fine and keep TICKET_PANEL_OPEN/CLOSE parity
- `normalizeLocation` (kept inline as one expression, not as a helper)
- `window.TMTicketPanel = { ... }` — DELETED entirely. RFC-10 removes this from the public API.
- The auto-redirect block `if (pageLocation && window.location.search.indexOf('book=1') !== -1) { ... }` — moved to booking-controller.
- The custom click listener on `ticketBookBtn` that recomputed URLs — TMBooking.attach handles it via `[data-tm-booking-trigger]` delegation.

**Constraints / things to AVOID:**
- Do NOT delete `getLocationContext`/`syncLocationOptions` — booking-policies.cjs requires `getTMBooking` references in this file? Re-check: `ticket-panel-uses-tm-booking` requires the substring `getTMBooking`. **The new file uses `window.TMBooking` directly, not a `getTMBooking()` helper.** Update the policy in Task 4 to require `window.TMBooking` instead. Do NOT add a no-op `getTMBooking` shim.
- Do NOT use heuristic selectors (booking-policies forbids `.btn-tickets, .btn-book-now`, etc.). Only `[data-tm-booking-trigger]` allowed; here we don't bind selectors at all — TMBooking owns it.
- Keep the early `return` when `#ticketPanel` or `#ticketLocation` are missing — pages without the panel must remain operational.
- Keep `window.TM.ready` substring presence — booking-policies `ticket-panel-waits-tm-ready` requires the literal string `window.TM.ready` in this file. The `getLocationContext` block keeps it.

**Step 2 — Post-edit GitNexus check:**
`gitnexus_detect_changes({scope: "staged"})` — only js/ticket-panel.js modified.
  </action>
  <verify>
    <automated>node -e "
      const fs = require('fs');
      const src = fs.readFileSync('js/ticket-panel.js', 'utf8');
      const forbidden = ['function getBookingUrl', 'TMTicketPanel', 'scheduleAutoRedirect', 'function tmTrack'];
      const present = ['data-tm-booking-trigger', 'window.TM.ready', 'window.TMBooking'];
      const violations = [];
      forbidden.forEach(s =&gt; { if (src.includes(s)) violations.push('STILL PRESENT: ' + s); });
      present.forEach(s =&gt; { if (!src.includes(s)) violations.push('MISSING: ' + s); });
      if (violations.length) { console.error(violations.join('\n')); process.exit(1); }
      console.log('ticket-panel slim OK');
    "</automated>
  </verify>
  <done>
js/ticket-panel.js is UI-only: no URL math, no auto-redirect, no public TMTicketPanel global.
Panel is mounted via window.TMBooking.mount(); programmatic open works via the `tm:booking:open` event.
gitnexus_detect_changes confirms only js/ticket-panel.js modified.
  </done>
</task>

<task type="auto">
  <name>Task 3: Delete js/roller-checkout.js, remove its script tag from all HTML/Astro/partials, update booking-policies + route-contract checker, run npm run check && npm run test:smoke</name>
  <files>js/roller-checkout.js, src/components/SiteScripts.astro, src/partials/about-inline-scripts.frag.txt, scripts/policies/booking-policies.cjs, scripts/check-route-contract.js, *.html (38 root pages with the script tag), tests/smoke/site.spec.js (only if a smoke test references it)</files>
  <action>
**Step 0 — GitNexus impact:**
Run `gitnexus_impact({target: "roller-checkout.js", direction: "upstream"})`.
Expected callers: SiteScripts.astro, root HTML pages with `<script src="js/roller-checkout.js">`, booking-policies.cjs, check-route-contract.js. If anything else surfaces (e.g. a runtime JS file imports it), pause and report.

**Step 1 — Delete the file:**
```bash
git rm js/roller-checkout.js
```

**Step 2 — Remove from src/components/SiteScripts.astro:**
Delete the line:
```html
&lt;script defer is:inline src="/js/roller-checkout.js?v=1"&gt;&lt;/script&gt;
```
Keep the rest of the script order intact. The booking-policies `marker_order` chain
expects `locations.js → booking-controller.js → ticket-panel.js`, which is preserved.

**Step 3 — Remove from src/partials/about-inline-scripts.frag.txt:**
```bash
grep -n "roller-checkout" src/partials/about-inline-scripts.frag.txt
```
Delete the matching line(s).

**Step 4 — Remove from all 38 root HTML pages:**
The script tag pattern in root HTML (per index.html line 4424):
```html
&lt;script src="js/roller-checkout.js?v=1"&gt;&lt;/script&gt;
```
or with leading slash. Use a single sed pass scoped to root + groups/ (skip dist/, node_modules/, .claude/, .planning/):
```bash
# List target files
find . -maxdepth 2 -name "*.html" \
  -not -path "./dist/*" -not -path "./node_modules/*" \
  -not -path "./.claude/*" -not -path "./.planning/*" \
  -not -path "./_archive/*" \
  -print0 | xargs -0 grep -l "roller-checkout" &gt; /tmp/rfc10-rm.txt
cat /tmp/rfc10-rm.txt
# Confirm count is ~38, then remove the line in-place:
while IFS= read -r f; do
  # Use python to safely strip the entire &lt;script ... roller-checkout ... &gt;&lt;/script&gt; line.
  python3 -c "
import sys, re, pathlib
p = pathlib.Path(sys.argv[1])
src = p.read_text()
# Match the script line (and trailing newline) referencing roller-checkout.js
new = re.sub(r'^[ \t]*&lt;script[^&gt;]*roller-checkout\.js[^&gt;]*&gt;\s*&lt;/script&gt;\s*\n', '', src, flags=re.MULTILINE)
if new != src:
    p.write_text(new)
    print('cleaned', sys.argv[1])
" "$f"
done &lt; /tmp/rfc10-rm.txt
```

Verify zero references remain in canonical paths:
```bash
grep -rln "roller-checkout" --include="*.html" --include="*.astro" --include="*.txt" . \
  | grep -v node_modules | grep -v dist/ | grep -v .claude/ | grep -v .planning/
# Expected: empty output.
```

**Step 5 — Update scripts/policies/booking-policies.cjs:**
Remove the four roller-related policies entirely:
- `no-roller-checkouts-map`
- `roller-no-iframe-cdn`
- `roller-no-checkout-symbol`
- `roller-no-cdn-domain`
Update the `ticket-panel-uses-tm-booking` rule's `needle` from `'getTMBooking'` to `'window.TMBooking'` (the slimmed ticket-panel.js no longer has the helper but does reference the global).
Leave the SiteScripts marker_order chain intact (it doesn't mention roller-checkout).

**Step 6 — Update scripts/check-route-contract.js:**
```bash
grep -n "roller-checkout" scripts/check-route-contract.js
```
Remove any line(s) that require `/js/roller-checkout.js` to appear in the SiteScripts script list. Replace with no equivalent — the contract simplifies.

**Step 7 — Search-and-update CSP hash mapping if needed:**
```bash
grep -n "roller-checkout" scripts/inject-csp-hashes.mjs _headers _headers.tmpl 2>/dev/null
```
If any match, remove. CSP uses script-src hashes only for inline blocks, so external src tags are unaffected by SHA256 list, but a stale entry doesn't hurt — just delete the file's hash line if present.

**Step 8 — Smoke test review:**
```bash
grep -n "roller-checkout\|TMTicketPanel" tests/smoke/site.spec.js
```
Expected: zero matches. If any, update or remove. Existing tests assert `#ticketBookBtn` href and `?book=1` redirect — these continue to pass because behavior is preserved on TMBooking.

**Step 9 — Run the verification gate (per CLAUDE.md):**
```bash
npm run check
npm run test:smoke
```
Both MUST exit 0. Failure investigation order:
  1. If `check-booking-architecture` complains: re-read scripts/policies/booking-policies.cjs and confirm Step 5 edits.
  2. If smoke test "ticket panel options hydrate" fails on the dropdown change → href assertion: re-check Task 1 mount() syncCtaHref behavior.
  3. If "open location ?book=1 navigates to https checkout" fails: re-check Task 1 scheduleAutoRedirect awaitTMReady polling and `cleanBookParam: true`.

**Step 10 — Final GitNexus check:**
`gitnexus_detect_changes({scope: "staged"})`. Expected scope:
- deleted: js/roller-checkout.js
- modified: js/booking-controller.js (Task 1), js/ticket-panel.js (Task 2)
- modified: src/components/SiteScripts.astro, src/partials/about-inline-scripts.frag.txt
- modified: scripts/policies/booking-policies.cjs, scripts/check-route-contract.js
- modified: ~38 *.html files (script tag removal)
Anything else (especially dist/) is suspect — pause and report.

**Constraints / things to AVOID:**
- Do NOT touch dist/ — it is build output and is regenerated by the Astro build. CLAUDE.md GitNexus rules already exclude dist via .gitignore patterns; if dist/ files appear in detect_changes, it means dist is checked in — pause and ask the user.
- Do NOT change `<script>` tag ORDER on HTML pages; only remove the roller-checkout line. The marker_order policy enforces locations → booking-controller → ticket-panel; that ordering must remain.
- Do NOT bump the `?v=` cache buster on other scripts. This change is invisible to URL versioning except for the deletion.
- Do NOT delete `window.BookingController` from booking-controller.js (already preserved in Task 1).
  </action>
  <verify>
    <automated>npm run check &amp;&amp; npm run test:smoke</automated>
  </verify>
  <done>
js/roller-checkout.js deleted; zero references remain in src HTML/Astro/partials/scripts (verified via `grep -rln "roller-checkout" --include="*.html" --include="*.astro" --include="*.txt" --include="*.cjs" --include="*.mjs" --include="*.js"` excluding dist/, node_modules/, .claude/, .planning/).
booking-policies.cjs trimmed (no roller-* rules, ticket-panel rule needle updated to `window.TMBooking`).
check-route-contract.js no longer requires roller-checkout.js in the script list.
`npm run check` and `npm run test:smoke` both exit 0.
GitNexus detect_changes scope matches the expected list (no surprise files touched).
  </done>
</task>

</tasks>

<verification>
End-to-end gate (per CLAUDE.md Verification gate):
- `npm run check` exits 0 — booking architecture, booking-policies, route-contract, location-contracts, sitemap, components, accessibility, internal-links all pass.
- `npm run test:smoke` exits 0 — homepage panel open, ticket dropdown → href, /philadelphia?book=1 https outbound nav, contact form, mobile selector, small-mobile suite all pass.
- Manual sanity (one-off in browser if accessible): hit `/philadelphia?book=1` and confirm a single deterministic redirect to the Roller URL with no `book=1` in the final URL.
- `gitnexus_detect_changes({scope: "all"})` after Task 3: scope matches expected files; no `dist/` modifications, no unrelated drift.
</verification>

<success_criteria>
- window.TMBooking exposes `{open, resolve, mount, attach, getDestination, navigate, isDirectBookingUrl}` (verified by node grep in Task 1 verify; smoke tests use these contracts indirectly).
- js/ticket-panel.js is pure UI (verified by node grep in Task 2: no `getBookingUrl`, no `TMTicketPanel`, no `scheduleAutoRedirect`, no helper `tmTrack`; presence of `window.TMBooking`, `window.TM.ready`, `data-tm-booking-trigger`).
- ?book=1 auto-redirect is owned by booking-controller and waits on TM.ready with a 1s deadline-bounded fallback. No synchronous else-branch fallthrough.
- js/roller-checkout.js no longer exists; no HTML, Astro, partial, or script references it.
- Public extension surface unchanged externally (window.TMFacade still re-exposes TMBooking via getter; new methods appear automatically).
- Smoke test "ticket panel options hydrate from location data" still passes with /orland-park?book=1 and /manassas?book=1 hrefs (the mount() coming-soon branch preserves this).
- Smoke test "open location ?book=1 navigates to https checkout" still passes (TMBooking.navigate preserves cleanBookParam + deferUntilLoad).
</success_criteria>

<output>
After completion, create `.planning/quick/260506-gnx-implement-rfc-10-deepen-booking-module-c/260506-gnx-SUMMARY.md` documenting:
- Files modified (booking-controller.js, ticket-panel.js, deleted roller-checkout.js, ~38 HTML pages, 2 scripts, 1 astro partial)
- New TMBooking surface members (open, resolve, mount)
- Race fix details (awaitTMReady deadline poll)
- Total LoC delta and final `npm run check` / `npm run test:smoke` exit codes
- GitNexus impact reports captured for getDestination / navigate / attach / getBookingUrl / scheduleAutoRedirect / roller-checkout.js
</output>
