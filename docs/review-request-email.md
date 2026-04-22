# Review Request Email — Draft

Copy-paste the version below. Replace `[YOUR NAME]`, `[GOOGLE SHEET LINK]`, `[STAGING URL]`, and `[DEADLINE DATE]` before sending. Everything else is ready.

---

## Subject line options (pick one)

- **Time Mission site — review needed by [day/date] before we lock dev**
- **Review the new Time Mission site (mobile + desktop)**
- **New Time Mission site is ready for your eyes — feedback window open**

---

## Email body (suggested: HTML-rendered if your email client allows it; otherwise the plaintext below works too)

---

Hi team,

The new Time Mission site is ready for your review. We've rebuilt it from the ground up to be faster, cleaner, and launch-ready for Houston. Before we hand it to Ari and New Epoche for full development — CMS wire-up, tracking, forms, hosting — I want every operator, owner, and partner to walk through it and catch anything wrong, missing, or off-brand.

**Target: have your feedback in by [DEADLINE DATE — suggest end of this week] so we can start development as early as next week.**

## Staging URL

**[STAGING URL]**

Please open it on:

1. **Your phone** (ideally the one you use day-to-day — iPhone or Android)
2. **A laptop or desktop** (Chrome or Safari, whichever you actually use)

The site has to feel right on both. About 70% of our customer traffic is mobile, and your review should reflect that — start on phone, then desktop.

## How to leave feedback

I've created a Google Sheet for all comments: **[GOOGLE SHEET LINK]**

Please drop your feedback there instead of email threads so nothing gets lost. The columns are set up for you:

| Page / section | Mobile or desktop | What you saw | What it should be | Priority |

A few ground rules:

- **One row per issue** — even small ones. Makes it easy to triage.
- **Be specific** — link to the page + describe where (header, middle, footer). A screenshot in the last column helps enormously.
- **Flag your role** in the "Reviewer" column so I know who's calling what out.

## What TO review

Please focus your time on:

- **Content accuracy** — your location's address, phone, email, hours. Is every detail right? This is the #1 thing I need eyes on.
- **Copy / tone / voice** — does this sound like Time Mission? Are we using language that works for your customer?
- **Photos** — are the right photos representing your venue? Anything dated or off-brand?
- **What's missing** — anything on the old site that you or your customers rely on that isn't here yet?
- **Navigation / findability** — can a new customer find what they need in under 10 seconds on their phone?
- **Local details** — parking, wayfinding, shared-building context (e.g., Lincoln is inside R1 Indoor Karting, Antwerp inside Experience Factory). If your location needs a note we don't have, flag it.

## What to IGNORE (this round)

This is a working prototype, not the finished product. Don't spend time on:

- **Book Now / Tickets buttons** — these aren't fully wired yet. They'll route through Roller (or your operator booking system) once Ari plugs in the backend. Assume the final booking flow is still being built.
- **Newsletter / contact form submissions** — backend isn't connected. Submissions don't go anywhere right now.
- **Google Analytics, Meta Pixel, tracking** — Ryan and Ari are wiring this after your review.
- **Cookie consent banner** — being rolled out by Ari separately.
- **Minor visual polish** (1–2 pixel alignment, very specific color tweaks) — the design is mostly frozen, but if something looks broken or off-brand, do call it out.
- **Anything that says "Coming Soon"** (Orland Park, Dallas, Brussels, etc.) — intentional, placeholder until those locations are confirmed.
- **Hero video auto-play quirks on iOS** — known, being tuned.

## Known items on our own list (no need to flag)

Just so you aren't telling us things we already know:

- Houston address/hours/phone are blank — pending operator confirmation
- Multi-language (Dutch for Antwerp, Spanish for US) not yet in place
- Some photos are placeholders, will be replaced with location-specific ones
- Pricing isn't shown on most pages yet — a per-location pricing decision is in progress
- "What is Time Mission?" hero explainer video is being discussed separately
- Per-location parking/wayfinding copy coming once operators send it

## What happens next

| When | Who | What |
|---|---|---|
| This week | You (review panel) | Walk the site, drop feedback in the Google Sheet |
| **[DEADLINE DATE]** | — | **Feedback window closes** |
| Next Monday | Me + Jefferson | Triage the sheet — resolve, decide, push back where needed |
| Next Mon–Tue | Me | Final content/design tweaks based on feedback |
| Next Wednesday | Ari (agency) | Hands over to full development — CMS, forms, tracking, staging → prod pipeline |
| ~May 12 | Everyone | Staging review for final sign-off |
| **May 19–22** | — | Launch ahead of Houston opening |

## Three specific asks for operators (please answer in the sheet)

1. **Does your phone number, address, email, and hours show correctly on your location page AND in the location picker (top-right nav on any page)?** If even one field is off, flag it.
2. **Is there anything about your venue that requires context the site doesn't give?** Examples: shared building, mall level, parking, specific entrance, staffed hours vs booking-only.
3. **Do you have photos of your venue you want us to use?** If yes, drop a link/folder in the sheet. We'll swap in the new ones before launch.

## Questions I already have

A few things worth your eyes alongside the review:

- **"The Clock is Ticking" tagline** — the old site used it; should we bring it back on the new one?
- **Pricing visibility** — would you rather the site show starting-at prices, or keep pricing on the booking flow only?
- **Gift card fulfillment** — is the current flow (buy → email code) still correct for every location?
- **Accessibility Statement** — we claim WCAG 2.1 AA; do we need a third-party audit sign-off, or is the current statement sufficient?
- **Corporate contact** — the new Licensing page points to Cranston and Nuenen. If any corporate details are stale, let me know now.

## A word on tone

I'd rather you flag ten small issues than let one slip. Use the sheet. If something makes you stop and think, that's worth noting. I'd also love your gut reaction: the first thing you feel when you land on the homepage, both on phone and on desktop. No need to be polished — a sentence is enough.

Thank you for making time for this. Final product will reflect all your input.

—
[YOUR NAME]

---

## Google Sheet template (columns to pre-fill)

When you create the sheet, set up these columns so reviewers are guided:

| # | Reviewer | Role (TM operator / LOL / agency / legal / etc.) | Page URL | Mobile or Desktop | Section (header, hero, footer, specific text) | What you saw | What it should be | Priority (Blocker / Important / Nice-to-have) | Screenshot link | Status |

Optional helper: add a second sheet titled "Questions" for reviewers to post questions Jefferson should answer rather than issues to fix. Helps keep the feedback sheet clean.

## Scheduling suggestions

- **Send the email Monday morning** — gives reviewers the full week.
- **Deadline: end of Friday (EOD reviewer's local time).** Anything landing Saturday/Sunday still gets triaged Monday.
- **Send a mid-week nudge** on Wednesday — short note with "this is where we stand, X rows in the sheet so far, thanks to [people who've contributed]". Keeps momentum.
- **Don't assume silence = approval.** If operators haven't engaged by Thursday, chase individually by phone.
