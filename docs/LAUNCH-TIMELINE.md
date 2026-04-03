# Time Mission Website Launch Timeline
**Created:** March 27, 2026
**Hard Deadline:** May 22, 2026 (before Houston launch)
**Buffer Week:** May 22–29 for post-launch fixes

---

## Team

| Person | Role | Responsibilities |
|--------|------|-----------------|
| **Jefferson** | Site owner / vibe-coder | Design, content, frontend code, coordination |
| **Ari** | Agency developer | CMS, analytics, framework migration, technical integration |
| **Ryan / New Epoche** | Google / ads | GA4, Google Ads, Search Console, pixel strategy |
| **TM Owners** | DNS / hosting | Domain control, DNS switch, hosting account ownership |

---

## Current Site Audit — What Exists vs. What's Missing

### Pages (Done)
- [x] Homepage (index.html) — fully built
- [x] Experiences (experiences.html) — fully built
- [x] Groups (groups.html) — fully built
- [x] Gift Cards (gift-cards.html) — fully built
- [x] FAQ (faq.html) — fully built
- [x] Contact (contact.html) — fully built
- [x] Locations index (locations/index.html) — built but has broken booking URLs
- [x] Philadelphia location — fully detailed
- [x] 6 other location pages — built but sparse (templates, not fleshed out)

### Pages (Missing)
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Cookie Policy
- [ ] Accessibility Statement
- [ ] 404 Error Page

### Known Bugs / Placeholder Content
- [ ] **Booking URLs wrong** — locations/index.html sends ALL locations to Philadelphia's Roller.app URL
- [ ] **All phone numbers are fake** — every location uses 555 test numbers
- [ ] **Location nav links broken** — experiences.html and locations/index.html use href="#" instead of linking to location pages
- [ ] **Social media links broken** — Instagram, TikTok, Facebook all point to href="#"
- [ ] **Forms don't submit** — contact form and newsletter form only show alert(), send nothing
- [ ] **Emails unverified** — @timemission.com addresses exist in code but may not be real mailboxes
- [ ] **Location pages sparse** — Chicago, Houston, Lincoln, Manassas, West Nyack, Antwerp are thin compared to Philadelphia
- [ ] **Gallery images placeholder** — location galleries use SVG placeholders, no real venue photos
- [ ] **No Houston email** — missing from Houston location detail card
- [ ] **No Antwerp phone number**

### Infrastructure (Missing — 0% done)
- [ ] Static site generator (Eleventy/Astro)
- [ ] CMS
- [ ] Hosting / deployment pipeline
- [ ] SSL
- [ ] Analytics (GA4)
- [ ] Google Tag Manager
- [ ] Tracking pixels
- [ ] Form backend
- [ ] Newsletter integration
- [ ] Sitemap.xml
- [ ] robots.txt
- [ ] Structured data (JSON-LD)
- [ ] Meta descriptions / Open Graph tags
- [ ] Cookie consent banner
- [ ] Google Search Console
- [ ] Google Business Profiles

---

## PHASE 1: Framework Migration
**Dates:** March 31 – April 11 (2 weeks)
**Owner:** Jefferson (with Claude Code)
**Dependency:** None — can start immediately

This is the foundation. Everything else is harder without it.

| Task | Est. Time | Date | Owner |
|------|-----------|------|-------|
| Choose framework (confirm with Ari on 3/27) | — | Mar 27 | Jefferson + Ari |
| Set up Eleventy/Astro project with build pipeline | 1 day | Mar 31 | Jefferson |
| Extract shared CSS into single stylesheet | 1 day | Apr 1 | Jefferson |
| Create shared layout (head, nav, footer) | 1 day | Apr 2 | Jefferson |
| Migrate homepage to framework | 1 day | Apr 3 | Jefferson |
| Migrate experiences, groups, gift-cards, FAQ, contact | 2 days | Apr 4–7 | Jefferson |
| Migrate all 7 location pages + index | 2 days | Apr 8–9 | Jefferson |
| Fix all broken nav links (href="#") | 0.5 day | Apr 10 | Jefferson |
| Fix booking URLs per location | 0.5 day | Apr 10 | Jefferson |
| Verify all pages render correctly after migration | 1 day | Apr 11 | Jefferson |

**Milestone: Site runs on framework with shared components. All pages work.** ✓

---

## PHASE 2: Content Fixes & Missing Pages
**Dates:** April 7 – April 18 (overlaps with Phase 1)
**Owner:** Jefferson
**Dependency:** Partially parallel with Phase 1

| Task | Est. Time | Date | Owner |
|------|-----------|------|-------|
| Collect real phone numbers for all locations | — | Apr 7 | Jefferson (from TM owners) |
| Collect real social media URLs | — | Apr 7 | Jefferson (from TM owners) |
| Verify all @timemission.com emails work | — | Apr 7 | Jefferson (from TM owners) |
| Replace all 555 placeholder phone numbers | 0.5 day | Apr 8 | Jefferson |
| Add real social media links (Instagram, TikTok, Facebook) | 0.5 day | Apr 8 | Jefferson |
| Add Houston email to Houston page | 10 min | Apr 8 | Jefferson |
| Add Antwerp phone number | 10 min | Apr 8 | Jefferson |
| Flesh out Chicago location page | 1 day | Apr 9 | Jefferson |
| Flesh out Houston location page | 1 day | Apr 10 | Jefferson |
| Flesh out remaining location pages (Lincoln, Manassas, West Nyack, Antwerp) | 2 days | Apr 11–14 | Jefferson |
| Add real venue photos to location galleries | 1 day | Apr 15 | Jefferson (needs photos from TM) |
| Create Privacy Policy page | 0.5 day | Apr 16 | Jefferson (legal review needed) |
| Create Terms of Service page | 0.5 day | Apr 16 | Jefferson (legal review needed) |
| Create Cookie Policy page | 0.5 day | Apr 17 | Jefferson |
| Create Accessibility Statement page | 0.5 day | Apr 17 | Jefferson |
| Create 404 Error page | 0.5 day | Apr 18 | Jefferson |

**Milestone: All content complete and accurate. No placeholders remain.** ✓

### Content You Need From TM Owners (request by Apr 3)
- [ ] Real phone numbers for all 7 locations
- [ ] Social media account URLs (Instagram, TikTok, Facebook)
- [ ] Confirm all @timemission.com emails are active
- [ ] Venue photos for each location (lobby, rooms, exterior)
- [ ] Operating hours for each location (confirm accuracy)
- [ ] Houston-specific details for launch
- [ ] Legal review of Privacy Policy and Terms (or provide existing ones)

---

## PHASE 3: CMS Integration
**Dates:** April 7 – April 25 (3 weeks, parallel with Phase 2)
**Owner:** Ari (agency)
**Dependency:** Framework choice from Phase 1

| Task | Est. Time | Date | Owner |
|------|-----------|------|-------|
| Set up CMS account (Sanity or Ari's recommendation) | 1 day | Apr 7 | Ari |
| Design content models: Locations | 1 day | Apr 8 | Ari + Jefferson |
| Design content models: Experiences, FAQs, Pricing | 1 day | Apr 9 | Ari |
| Design content models: Pages, Announcements | 1 day | Apr 10 | Ari |
| Integrate CMS with static site generator | 3 days | Apr 11–15 | Ari |
| Migrate existing content into CMS | 2 days | Apr 16–17 | Jefferson |
| Set up image CDN / optimization through CMS | 1 day | Apr 18 | Ari |
| Test: Jefferson can edit and publish content without code | 1 day | Apr 21 | Jefferson + Ari |
| Set up user accounts (Jefferson, TM team) | 0.5 day | Apr 22 | Ari |
| Train Jefferson on CMS workflow | 0.5 day | Apr 22 | Ari |
| CMS content scheduling (if supported) | 0.5 day | Apr 23 | Ari |
| Buffer for fixes | — | Apr 24–25 | Ari |

**Milestone: Jefferson can update any content through CMS without touching code.** ✓

---

## PHASE 4: SEO
**Dates:** April 14 – April 25 (2 weeks, parallel with CMS)
**Owner:** Jefferson (with Claude Code) + Ryan for strategy
**Dependency:** Framework migration complete

| Task | Est. Time | Date | Owner |
|------|-----------|------|-------|
| Add meta descriptions to all pages | 1 day | Apr 14 | Jefferson |
| Add Open Graph tags to all pages | 0.5 day | Apr 15 | Jefferson |
| Add Twitter Card tags to all pages | 0.5 day | Apr 15 | Jefferson |
| Add canonical URLs to all pages | 0.5 day | Apr 16 | Jefferson |
| Generate sitemap.xml (automate in build) | 0.5 day | Apr 16 | Jefferson |
| Create robots.txt | 15 min | Apr 16 | Jefferson |
| Add LocalBusiness structured data for each location | 1 day | Apr 17 | Jefferson |
| Add Organization structured data | 0.5 day | Apr 18 | Jefferson |
| Add FAQ structured data to FAQ page | 0.5 day | Apr 18 | Jefferson |
| Add alt text to all images | 1 day | Apr 21 | Jefferson |
| Internal linking audit and improvements | 0.5 day | Apr 22 | Jefferson |
| Map old site URLs → new URLs for 301 redirects | 1 day | Apr 23 | Jefferson + Ari |
| Configure 301 redirects in hosting | 0.5 day | Apr 24 | Ari |
| Verify with Google Rich Results Test | 0.5 day | Apr 25 | Jefferson |
| Coordinate keyword strategy with Ryan | — | Apr 14 | Jefferson + Ryan |

**Milestone: Site is fully optimized for search. Redirects mapped.** ✓

---

## PHASE 5: Analytics, GTM & Tracking Pixels
**Dates:** April 21 – May 2 (2 weeks)
**Owner:** Ari (setup) + Ryan (Google config)
**Dependency:** Framework migration complete, Ryan availability

| Task | Est. Time | Date | Owner |
|------|-----------|------|-------|
| Create Google Tag Manager container | 0.5 day | Apr 21 | Ari |
| Install GTM snippet on all pages (via layout) | 0.5 day | Apr 21 | Ari |
| Grant GTM access to Ryan and Jefferson | 15 min | Apr 21 | Ari |
| Create or connect GA4 property | 0.5 day | Apr 22 | Ryan |
| Configure GA4 via GTM | 0.5 day | Apr 22 | Ryan |
| Set up conversion events in GA4 | 1 day | Apr 23 | Ryan + Ari |
| — Book Now clicks | — | — | — |
| — Form submissions | — | — | — |
| — Outbound clicks to Roller.app | — | — | — |
| — Phone number clicks | — | — | — |
| — Newsletter signups | — | — | — |
| Install Meta/Facebook Pixel via GTM | 0.5 day | Apr 24 | Ryan (provides ID) + Ari (installs) |
| Install Google Ads conversion tag via GTM | 0.5 day | Apr 24 | Ryan |
| Install TikTok Pixel via GTM (if needed) | 0.5 day | Apr 25 | Ryan |
| Set up Microsoft Clarity (free heatmaps) | 0.5 day | Apr 25 | Ari |
| Add UTM parameters to all Roller.app booking URLs | 0.5 day | Apr 28 | Jefferson |
| Set up Google Search Console | 0.5 day | Apr 28 | Ryan |
| Test all tracking with Tag Assistant | 1 day | Apr 29 | Ari + Ryan |
| Set up remarketing audiences | 0.5 day | Apr 30 | Ryan |
| Buffer for fixes | — | May 1–2 | All |

**Milestone: All tracking live and verified. Ryan has dashboards.** ✓

### Coordination Required
- [ ] **Ari + Ryan call** by April 17 to align on GTM structure and pixel IDs
- [ ] Ryan provides: GA4 property ID, Google Ads conversion ID, Meta Pixel ID
- [ ] Decide: which ad platforms are active for Houston launch?

---

## PHASE 6: Forms & Email
**Dates:** April 21 – May 2 (parallel with Phase 5)
**Owner:** Ari + Jefferson
**Dependency:** Framework migration complete

| Task | Est. Time | Date | Owner |
|------|-----------|------|-------|
| Set up form backend (Netlify Forms / Formspree) | 0.5 day | Apr 21 | Ari |
| Connect contact form to backend | 0.5 day | Apr 22 | Ari |
| Set up email notifications for form submissions | 0.5 day | Apr 22 | Ari |
| Set up separate routing for group booking inquiries | 0.5 day | Apr 23 | Ari + Jefferson |
| Set up email marketing platform (Mailchimp/Klaviyo) | 0.5 day | Apr 24 | Ari |
| Connect newsletter signup form to email platform | 0.5 day | Apr 24 | Ari |
| Create welcome email for newsletter signups | 0.5 day | Apr 25 | Jefferson |
| Test all forms end-to-end with real submissions | 0.5 day | Apr 28 | Jefferson |

**Milestone: All forms work. Submissions arrive in real inboxes.** ✓

---

## PHASE 7: Legal & Compliance
**Dates:** April 28 – May 9 (overlaps with testing)
**Owner:** Jefferson + Ari
**Dependency:** Legal pages written (Phase 2), CMS live

| Task | Est. Time | Date | Owner |
|------|-----------|------|-------|
| Legal review of Privacy Policy and Terms | — | Apr 28 | TM Owners (legal team) |
| Install cookie consent tool (CookieBot/Osano) | 1 day | Apr 29 | Ari |
| Configure cookie categories (necessary, analytics, marketing) | 0.5 day | Apr 30 | Ari |
| Ensure GTM respects cookie consent (don't fire pixels without consent) | 1 day | May 1 | Ari |
| GDPR-specific setup for Antwerp visitors | 0.5 day | May 2 | Ari |
| Accessibility audit (Lighthouse + WAVE) | 1 day | May 5 | Jefferson |
| Fix critical accessibility issues | 2 days | May 6–7 | Jefferson |
| Final legal review | — | May 8–9 | TM Owners |

**Milestone: Legally compliant. Cookie consent working. Accessible.** ✓

---

## PHASE 8: Performance & QA
**Dates:** May 5 – May 16 (2 weeks)
**Owner:** Jefferson + Ari
**Dependency:** All features complete

| Task | Est. Time | Date | Owner |
|------|-----------|------|-------|
| Compress all images (WebP, lazy loading) | 1 day | May 5 | Jefferson |
| Minify CSS and JavaScript | 0.5 day | May 6 | Ari (build pipeline) |
| Run Lighthouse audit — target 90+ all categories | 0.5 day | May 6 | Jefferson |
| Fix performance issues from Lighthouse | 1 day | May 7 | Jefferson |
| Cross-browser testing: Chrome, Safari, Firefox, Edge | 1 day | May 8 | Jefferson + Ari |
| Mobile testing: iOS Safari, Android Chrome | 1 day | May 9 | Jefferson + Ari |
| Test all booking flows end-to-end (every location) | 1 day | May 12 | Jefferson |
| Test all forms with real submissions | 0.5 day | May 12 | Jefferson |
| Verify all tracking fires correctly | 0.5 day | May 13 | Ari + Ryan |
| Test social sharing previews (Facebook debugger, Twitter validator) | 0.5 day | May 13 | Jefferson |
| Link audit — no broken links, no 404s | 0.5 day | May 14 | Jefferson |
| Load testing (if running ads at launch) | 0.5 day | May 14 | Ari |
| Fix all issues found in QA | 2 days | May 15–16 | Jefferson + Ari |

**Milestone: Site passes all quality checks. Ready for launch.** ✓

---

## PHASE 9: Staging & Stakeholder Review
**Dates:** May 12 – May 18 (1 week, overlaps with QA)
**Owner:** Jefferson + TM Owners
**Dependency:** All features and content complete

| Task | Est. Time | Date | Owner |
|------|-----------|------|-------|
| Deploy to staging URL | 0.5 day | May 12 | Ari |
| Jefferson full review of staging site | 1 day | May 13 | Jefferson |
| TM Owners review staging site | 2 days | May 14–15 | TM Owners |
| Collect and prioritize feedback | 0.5 day | May 16 | Jefferson |
| Implement critical fixes from feedback | 2 days | May 17–18 | Jefferson + Ari |

**Milestone: Stakeholders have approved staging site.** ✓

---

## PHASE 10: Go Live
**Dates:** May 19 – May 22
**Owner:** All
**Dependency:** Staging approved, DNS access confirmed

| Task | Est. Time | Date | Owner |
|------|-----------|------|-------|
| Final pre-launch checklist review | 0.5 day | May 19 | Jefferson + Ari |
| TM Owners update DNS (point domain to new hosting) | 0.5 day | May 19 | TM Owners |
| Verify SSL is working on timemission.com | 15 min | May 19 | Ari |
| Verify site loads correctly on production domain | 0.5 day | May 19 | Jefferson |
| Configure 301 redirects from old URLs | 0.5 day | May 20 | Ari |
| Submit sitemap to Google Search Console | 15 min | May 20 | Ryan |
| Verify all tracking fires on production | 0.5 day | May 20 | Ari + Ryan |
| Test all forms on production | 0.5 day | May 20 | Jefferson |
| Test all booking links on production | 0.5 day | May 20 | Jefferson |
| Monitor for errors (Day 1) | — | May 21 | All |
| Monitor for errors (Day 2) | — | May 22 | All |

**Milestone: SITE IS LIVE.** ✓

---

## POST-LAUNCH (May 22 – June 5)
**Owner:** All
**Purpose:** Catch and fix issues from real traffic

| Task | Date | Owner |
|------|------|-------|
| Monitor Google Search Console daily for crawl errors | May 22+ | Ryan |
| Monitor analytics daily — verify events tracking | May 22+ | Ryan |
| Fix any broken pages/links reported by users | As needed | Jefferson |
| Review heatmaps after ~500 visitors (Clarity) | ~May 29 | Jefferson + Ryan |
| SEO check — are pages being indexed? | May 29 | Ryan |
| First analytics review — what's working, what's not | June 5 | All |
| Plan V2 improvements based on data | June 5 | Jefferson |

---

## Visual Timeline (Week View)

```
         Mar 31    Apr 7     Apr 14    Apr 21    Apr 28    May 5     May 12    May 19
         Week 1    Week 2    Week 3    Week 4    Week 5    Week 6    Week 7    Week 8
         --------  --------  --------  --------  --------  --------  --------  --------
Phase 1  [=FRAMEWORK MIGRATION==]
Phase 2            [==CONTENT FIXES & MISSING PAGES==]
Phase 3            [====CMS INTEGRATION (Ari)==========]
Phase 4                      [====SEO==============]
Phase 5                                [====ANALYTICS & PIXELS=====]
Phase 6                                [====FORMS & EMAIL==========]
Phase 7                                          [====LEGAL==========]
Phase 8                                                    [====QA & PERFORMANCE===]
Phase 9                                                              [==REVIEW==]
Phase 10                                                                       [LIVE]
```

---

## Critical Path — What Blocks Everything Else

These items are on the critical path. If any slip, launch slips:

1. **Framework migration (Phase 1)** — Blocks CMS, SEO, analytics, everything
2. **CMS integration (Phase 3)** — Blocks content workflow for launch
3. **Real content from TM Owners** — Phone numbers, photos, legal review. Request by April 3.
4. **Ari + Ryan coordination call** — Must happen by April 17 for pixel setup
5. **DNS switch (TM Owners)** — Must be scheduled in advance for May 19

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ari's agency is slow or overcommitted | CMS and analytics delayed | Get timeline commitment in writing today. Have fallback plan (Decap CMS). |
| TM Owners slow to provide content (phone #s, photos, legal) | Content incomplete at launch | Send request by April 3 with hard deadline of April 14. |
| Framework migration takes longer than expected | Everything shifts right | Start Monday Mar 31. If stuck by Apr 7, simplify to CSS extraction only. |
| Ryan unavailable for pixel setup | No tracking at launch | Schedule the Ari+Ryan call NOW. Pixels without Ryan = launching ads blind. |
| DNS switch goes wrong | Site down | Do DNS change on Monday (May 19), not Friday. Have rollback plan. |
| Legal review takes too long | Launch without privacy policy = legal risk | Use a template generator (Termly, iubenda) as a stopgap. Replace with lawyer-reviewed version later. |
| Roller.app booking URLs change | Booking broken | Confirm all URLs with TM operations team by April 7. |

---

## Weekly Check-In Agenda

Every Monday, 15-min sync with Ari (add Ryan starting Week 4):

- What was completed last week?
- What's blocked?
- What's the plan for this week?
- Any scope changes or risks?

---

## Immediate Next Steps (This Week: Mar 27–28)

- [ ] **Today (Mar 27):** Meet with Ari — confirm framework, CMS, timeline, cost
- [ ] **Today (Mar 27):** Ask Ari to schedule call with Ryan by April 17
- [ ] **Mar 28:** Send TM Owners content request list (phone numbers, photos, social URLs, legal docs)
- [ ] **Mar 28:** Set up weekly Monday check-in with Ari
- [ ] **Mar 31:** Start framework migration
