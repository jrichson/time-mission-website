# Hero Medium Audit — Phase 10 Plan 10-05

Status: complete
Date: 2026-05-04
Source: src/partials/{location}-main.frag.txt

## Astro-rendered location pages

| Location | Partial file | Hero medium | Line(s) | Action |
|----------|--------------|-------------|---------|--------|
| Philadelphia | philadelphia-main.frag.txt | VIDEO (`<video id="heroVideo">`) | 4 | none — visual parity protects video |
| Houston | houston-main.frag.txt | VIDEO (`<video id="heroVideo">`) | 4 | none — visual parity protects video |
| Antwerp | antwerp-main.frag.txt | VIDEO (`<video id="heroVideo">`) | 4 | none — visual parity protects video |

## Conclusion

- Zero `IMG_SINGLE` candidates found among Astro-rendered location partials.
- All three partials (philadelphia, houston, antwerp) use a `<video id="heroVideo">` element with two `<source>` children (mobile + desktop MP4s) as their hero medium.
- No `<picture>` srcset conversion is required in Task 2 of Plan 10-05.
- Statement: "Per docs/hero-medium-audit.md, all Astro-rendered location partials use `<video>` heroes; no srcset conversion needed in Phase 10."

## Asset availability

No `IMG_SINGLE` candidates were identified; therefore no hero image asset availability
check is required. The hero image asset inventory is deferred unless a future plan
migrates a location partial from `<video>` to a still-image hero.

## Methodology

Each partial's first 50 lines were read. The hero is the first major element
inside `<section class="hero">`. All three partials share an identical structure:

```html
<section class="hero">
    <div class="hero-video-container">
        <video id="heroVideo" autoplay muted loop playsinline webkit-playsinline ...>
            <source src="{{TM_MEDIA_BASE}}/assets/video/hero-bg-mobile.mp4" ...>
            <source src="{{TM_MEDIA_BASE}}/assets/video/hero-bg-web.mp4" ...>
        </video>
    </div>
    ...
</section>
```

Per UI-SPEC Surface 4 and CONTEXT.md item 3: VIDEO heroes must not be replaced with
`<picture>` elements (visual parity rule). The Philadelphia hero was pre-confirmed
as `<video>` in the plan interfaces block; Houston and Antwerp were confirmed by
reading the partial files during this audit.
