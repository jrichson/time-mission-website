# Booking CTA surface matrix

## Purpose

Phase 5 operator reference for BOOK-01 / D-04: where booking intent is triggered, which handler runs, and whether navigation stays in the same tab by default.

## Surfaces

| Surface | Selector / element | Behavior | Same-tab? |
|---------|-------------------|----------|-----------|
| Hero primary tickets | `.hero-cta .btn-tickets` | `bookOrOpenPanel` | Yes (`location.assign` for `https:`) |
| Nav / mirrored booking CTAs | `.btn-tickets`, `.btn-book-now`, roller/tickets href buttons (see `ticket-panel.js` query) | `bookOrOpenPanel` | Yes |
| Ticket panel Continue | `#ticketBookBtn` | Dedicated listener (`location.href`) | Yes |
| Location overlay Book Now | `.location-info-book` | Native `<a>` from `nav.js` (`href = pageUrl + '?book=1'` for open venues) | Yes (no `_blank` in script) |
| Location page inline Book CTAs | Authored anchors | Native navigation / ticket-panel rules | Yes unless legacy markup adds `target="_blank"` (audit if added later) |

## Coming-soon

Overlay and ticket flow use Sign Up / internal paths — no external checkout URL from `getBookingUrl` for coming-soon locations.
