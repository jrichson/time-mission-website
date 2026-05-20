# Booking CTA and Link Surface Matrix

Last audited: 2026-05-20

## Scope

This matrix covers the public site surfaces that behave like buttons or destination links: navigation, booking CTAs, group inquiries, gift cards, waivers, contact/newsletter forms, location-picker CTAs, and UI-only controls. Repeated components are listed once because they render across many pages.

## Main Navigation

| Surface | Destination / behavior | Notes |
| --- | --- | --- |
| Logo | `/` | On nested group routes, relative rendered links resolve back to the canonical route. |
| Locations | `/locations` | Internal route. |
| Missions | `/missions` | Internal route. |
| Groups | `/groups` | Internal route. |
| Gift Cards | `/gift-cards` | Internal route. |
| Contact | `/contact` | Internal route. |
| Book Now | Booking trigger | Opens the location picker/panel when no location is active; otherwise resolves through `window.TMBooking`. |
| Mobile menu links | Same as desktop nav | Same destinations and booking trigger behavior. |

## Ticket Booking

| Location state | Destination / behavior | Notes |
| --- | --- | --- |
| No active location | Ticket panel | User must choose a location before continuing. |
| Mount Prospect | Roller checkout URL | Opens through Roller behavior. |
| Philadelphia | Roller checkout URL | Opens through Roller behavior. |
| Manassas | Roller checkout URL | Opens through Roller behavior. |
| Houston | Roller checkout URL | Opens through Roller behavior. |
| Orland Park | Roller checkout URL | Opens through Roller behavior. |
| Lincoln | `https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959` | External provider navigation. |
| Antwerp | `https://timemission.eu/antwerp` | Intentional EU external site handoff. |
| West Nyack from any page | Briq widget inside the current ticket panel | Uses `data-domain="timemission-palisades"` and hidden Briq main button. |
| Future multiple-Briq setup | Venue page reload | If more than one Briq domain is configured, the controller routes to the selected venue page before opening so the widget initializes with the correct domain. |
| Dallas / Brussels | `/contact?location=<slug>&type=updates` | Coming-soon lead flow. |
| `/missions` mission-card and final Book Now CTAs | Booking trigger | Uses the same ticket-booking flow as the hero/nav CTAs. |

## Group Inquiries

| Selected location | Destination / behavior | Notes |
| --- | --- | --- |
| No active location | Ticket panel in group mode | User must choose a location before continuing to the right form. |
| Mount Prospect | Pipedrive form URLs by group type | Birthday, corporate, field trip, bachelor/ette, private events, holiday. |
| Philadelphia | `https://forms.roller.app/#/timemissionphiladelphiapa/1446ba8be6094ad/form` | Same form for all group types. |
| Manassas | Pipedrive form URLs by group type | Birthday, corporate, field trip, bachelor/ette, private events, holiday. |
| Houston | `https://forms.roller.app/#/timemissionhouston/bc80621a90b3417/form` | Same form for all group types. |
| Orland Park | Pipedrive form URLs by group type | Birthday, corporate, field trip, bachelor/ette, private events, holiday. |
| Lincoln | `https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959` | External provider navigation. |
| Antwerp | `https://www.experience-factory.com/antwerp/online-booking/#your-group=groups-of-friends&your-favorite-experience=time-mission` | Intentional EU/external group handoff. |
| West Nyack from any page | Briq widget inside the current ticket panel | Briq group URLs are converted to the internal Briq widget handoff instead of raw external Briq navigation. |
| Future multiple-Briq setup | Venue page reload | Same domain-safety guard as ticket booking. |
| Dallas / Brussels | Disabled/unavailable in panel | No approved group form URL is present in the audit fixture. |

## Gift Cards

| Selected location | Destination / behavior | Notes |
| --- | --- | --- |
| Manassas | `https://book.manassas.timemission.com/giftcards/en-us/products` | External provider page. |
| Mount Prospect | `https://book.mountprospect.timemission.com/giftcards/en-us/products` | External provider page. |
| Philadelphia | `https://book.philadelphia.timemission.com/timemissionphiladelphiapa/onlinecheckout/en-us/home` | Provider checkout page. |
| West Nyack | Disabled/unavailable | No approved gift-card URL is present; users see an unavailable message instead of a raw Briq handoff. |
| Lincoln | `https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959` | External provider page. |
| Orland Park | `https://book.orlandpark.timemission.com/giftcards/en-us/products` | External provider page. |
| Antwerp / Houston / Dallas / Brussels | Disabled/unavailable | No approved gift-card URL is present. |

## Waivers

| Selected location | Destination / behavior | Notes |
| --- | --- | --- |
| Manassas | `https://waiver.roller.app/TimeMissionManassasMall` | External waiver page. |
| Mount Prospect | `https://waiver.roller.app/TimeMissionManassasMall` | Known data anomaly to verify: same waiver URL as Manassas. |
| Philadelphia | `https://waiver.roller.app/TimeMissionPhiladelphiaPA` | External waiver page. |
| Houston | `https://book.houston.timemission.com/timemissionhouston/onlinecheckout/en-us/home` | Audit-approved destination, but this is a booking URL rather than a dedicated waiver URL. |
| Orland Park | `https://book.orlandpark.timemission.com/giftcards/en-us/products` | Known data anomaly to verify: gift-card URL is used as waiver destination. |
| West Nyack / Lincoln / Antwerp / Dallas / Brussels | Disabled/unavailable | No waiver URL is present. |

## Forms

| Surface | Destination / behavior | Notes |
| --- | --- | --- |
| Contact page form | `POST /api/contact` | Cloudflare Pages function exists at `functions/api/contact.js`. |
| Newsletter forms | `POST /api/newsletter` | Cloudflare Pages function exists at `functions/api/newsletter.js`; acquisition sections may be hidden while paused. |
| Groups embedded inquiry form | Removed | Group inquiries route through the booking controller instead of rendering the old FormSubmit form. |

## Internal Link Families

| Surface | Destination / behavior | Notes |
| --- | --- | --- |
| Footer primary links | `/`, `/locations`, `/missions`, `/groups`, `/gift-cards`, `/about`, `/contact`, `/faq` | Internal routes. |
| Footer location links | Location canonical paths | Includes `/west-nyack`, `/mount-prospect`, `/philadelphia`, `/manassas`, `/houston`, `/orland-park`, `/dallas`, `/lincoln`, `/antwerp`, `/brussels`. |
| Footer legal links | `/privacy`, `/terms`, `/accessibility`, `/cookies`, `/code-of-conduct` | Internal routes. |
| Group type cards | `/groups/birthdays`, `/groups/corporate`, `/groups/field-trips`, `/groups/bachelor-ette`, `/groups/private-events`, `/groups/holidays` | Internal routes. |
| Location overlay city links | Active location update | Selecting a city updates the active site location, keeps the user on the current page, and previews location details; the overlay Book Now CTA resolves through `TMBooking`. |

## UI-Only Controls

| Surface | Behavior | Notes |
| --- | --- | --- |
| Location picker open/close, preview, and footer Change Location | Opens or updates location state | No external navigation expected. |
| Ticket panel close / overlay / Escape | Closes active panel | No navigation expected. |
| FAQ accordion buttons | Expand/collapse answers | No navigation expected. |
| Mission filter chips | Filter mission cards | No navigation expected. |
| Carousel arrows and dots | Change visible slide | No navigation expected. |
| Cookie preferences controls | Consent UI state | No navigation expected. |
| Language selectors | Switch visible labels and `lang` state | No navigation expected. |
| Hidden location/contact placeholders | Hydrated by location runtime before becoming visible | Audit sees their default `href="#"` / blank `href`, but they are hidden template rows until populated. |
| Logo after selecting a location | `/` | Location changes no longer retarget logo links to venue pages. |

## Known Follow-Ups

| Item | Status |
| --- | --- |
| `/missions` Book Now CTAs | Fixed to use the site booking trigger instead of plain `href="#"`. |
| West Nyack gift cards | Disabled until an approved gift-card checkout URL exists. |
| Mount Prospect waiver URL | Verify whether the Manassas waiver URL is intentional. |
| Houston / Orland Park waiver destinations | Verify whether booking/gift-card URLs should be used for waiver CTAs. |
