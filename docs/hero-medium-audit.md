# Hero Media Contract

Status: active
Last updated: 2026-05-22

The public site uses video heroes for the location and homepage partials that opt into the shared hero treatment. This file records the current contract; the executable source of truth is `scripts/check-hero-media-contract.js`.

## Contract

- Hero video partials must use `<video id="heroVideo">` with mobile and desktop MP4 sources.
- Videos remain decorative unless a page explicitly needs user-controllable media.
- Markup keeps `preload="none"` so the poster can provide first paint.
- Runtime playback is deferred by `js/page-widgets.js` and respects reduced motion, Save-Data, and slow-connection users.
- Stale old hero MP4 bundles must not be present in `assets/`, `public/`, or `dist/`.

## Validation

Run:

```bash
npm run check:hero-media
```

The full production gate also includes this check:

```bash
npm run verify
```

## Changing Hero Media

Do not swap a validated video hero to a still-image or `<picture>` treatment as a drive-by optimization. If a page needs a new hero medium, update the design reference, page partial, CSS, runtime behavior, and `scripts/check-hero-media-contract.js` together so the contract remains executable.
