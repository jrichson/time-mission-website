# Booking CTA surface matrix

## Purpose

Phase 5 operator reference for BOOK-01 / D-04: where booking intent is triggered, which handler runs, and whether navigation stays in the same tab by default.

## Surfaces

| Surface | Selector / element | Behavior | Same-tab? |
|---------|-------------------|----------|-----------|
| Hero primary tickets | `.hero-cta .btn-tickets` | Prompts for location when needed, then uses the selected venue's booking destination | Yes; checkout providers render in the booking frame when supported |
| Nav / mirrored booking CTAs | `.btn-tickets`, `.btn-book-now`, `[data-tm-booking-trigger]` | Uses the active or page location to choose the correct tickets, group, gift card, or waiver destination | Yes; provider URLs stay in the booking frame unless the Location Catalog marks an EU external site |
| Ticket panel Continue | `#ticketBookBtn` | Keeps the destination synchronized with the selected dropdown location | Yes; provider URLs stay in the booking frame |
| Location overlay Book Now | `.location-info-book` | Uses the previewed location, including coming-soon and EU behavior | Yes; EU locations intentionally navigate to `timemission.eu` |
| Location page inline Book CTAs | Authored anchors | `TMBooking.attach` / authored internal paths | Yes unless legacy markup adds `target="_blank"` (audit if added later) |

## Coming-soon

Lead-only locations use Sign Up / internal paths. Coming-soon locations with a provider URL can still render a booking frame.
