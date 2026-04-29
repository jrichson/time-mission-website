# Behavior baseline (smoke tests)

Source: `tests/smoke/site.spec.js` — executed via **Playwright** with **`npm run test:smoke`** at baseline (same gate as `npm run verify`).

| Test (title) | Baseline |
|--------------|----------|
| homepage loads core navigation and booking panel | pass |
| ticket panel options hydrate from location data | pass |
| location selection persists canonical slug | pass |
| faq accordion exposes keyboard accessible controls | pass |
| contact form uses configured submission endpoint | pass |

## Covered behaviors

- **FAQ keyboard:** First `.faq-question` has `role="button"` and toggles `aria-expanded` on Enter (`/faq.html`).
- **Ticket panel:** `.hero-cta .btn-tickets` opens `#ticketPanel` (class `active`); `#ticketLocation` options hydrate (count 10); `#ticketBookBtn` href updates with slug query (`/?book=1`).
- **Nav / location:** `#locationBtn` opens picker; `#locationDropdown a[data-city="Philadelphia"]` navigates to `philadelphia.html`; `#locationText` updates; `localStorage['tm_location']` persists canonical slug `philadelphia`.
- **Contact form:** `form.contact-form` uses POST and action matching contact-thank-you / Formspree / Netlify patterns (`/contact.html`).
