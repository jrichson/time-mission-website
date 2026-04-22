# Pre-Launch Review — 2026-04-22
Compares the new local site against the live site at [timemission.com](https://timemission.com/). Findings ranked **BLOCKER / IMPORTANT / NICE-TO-HAVE**. For each, target page and suggested fix/owner.

> **How to read this:** anything under "BLOCKER" must be resolved before sending the site to the team for review — it's either wrong data that will confuse reviewers or missing content that will surface in review anyway. "IMPORTANT" items are real gaps but could be acknowledged + tracked. "Nice-to-have" can ship later.

---

## 🔴 BLOCKER — Data Accuracy (fix before team sees it)

All location data on the new site is placeholder; the old site has the real values. Using placeholder data in JSON-LD and visible page text will be the first thing reviewers flag.

### Real location data (captured from the live old site)

| Slug | Venue | Street | City, St Zip | Phone | Email | Hours (Mon/Fri/Sat/Sun) |
|---|---|---|---|---|---|---|
| philadelphia | Philly | 1530 Chestnut Street | Philadelphia, PA 19102 | **(267) 710-1240** | philly@timemission.com | 12–10 / 12–11 / 10–11 / 10–10 |
| lincoln | R1 Indoor Karting | 100 Higginson Ave | **Lincoln, RI 02865** | **(401) 721-5554** | **info@r1indoorkarting.com** | 12–11 / 12–Mid / 9–Mid / 9–11 |
| west-nyack | Palisades Center | 3532 Palisades Center Dr, Level 3 | West Nyack, NY 10994 | **(845) 328-4528** | palisades@timemission.com | 12–9 / 12–11 / 10–11 / 10–8 |
| manassas | Manassas Mall | 8300 Sudley Rd, Unit A2 | Manassas, VA 20109 | **(571) 732-1050** | manassas@timemission.com | 12–9 / 12–Mid / 10–Mid / 10–8 |
| mount-prospect | Mt Prospect | 132 Randhurst Village Drive | Mount Prospect, IL 60056 | **(847) 250-9560** | mtprospect@timemission.com | 12–9 / 12–Mid / 10–Mid / 10–8 |
| antwerp | Experience Factory | Michiganstraat 1 | 2030 Antwerp, Belgium | +32 3 301 03 03 | info@experience-factory.com | 14–23 / 14–23 / 11–23 / 11–23 |
| houston | — | *not yet open* | *Marq'E area, TX* | *TBD* | *TBD* | *TBD* |

### Specific diffs against new-site code
| Problem | Where | Fix |
|---|---|---|
| **Lincoln is in the wrong state.** We say "Lincoln, NE 68510". It's Lincoln **RI** at R1 Indoor Karting. | `docs/locations-data.json` L163–170, `locations/index.html:589`, `lincoln.html` throughout | Change state to RI, zip to 02865, street 100 Higginson Ave, venue R1 Indoor Karting. |
| Philadelphia address is placeholder "123 Market Street". Real: 1530 Chestnut Street, 19102. | `docs/locations-data.json` L13, `locations/index.html:508`, `philadelphia.html:2756` (JSON-LD!) | Update. JSON-LD with wrong address goes straight to Google. |
| All 6 US phone numbers use 555 placeholders. | `docs/locations-data.json` L22/72/122/172/222/272, `contact.html:654/677` | Replace with real numbers above. |
| Philadelphia email convention mismatch. Old site uses `philly@timemission.com`; new site uses `philadelphia@timemission.com`. | JSON + all philadelphia refs | Use `philly@` to match existing mailbox. |
| Lincoln email should be operator's `info@r1indoorkarting.com`, not `lincoln@timemission.com`. | JSON + lincoln refs | Operator owns the mailbox. |
| West Nyack email should be `palisades@timemission.com`, not `westnyack@timemission.com`. | JSON + west-nyack refs | Operator mailbox. |
| Antwerp email should be `info@experience-factory.com`, not `antwerp@timemission.com`. | JSON + antwerp refs | Operator mailbox. |
| Hours are uniform placeholder (10–9 M-Th etc.) across all 6 open locations. Real hours vary significantly. | JSON + every location page | Update per row above. |
| Houston carries 555 phone + placeholder values despite being "coming_soon". | JSON L113–135 | Either null these or mark "announcement-only page" explicitly. |
| Zip missing on most locations. | JSON | Fill in. |
| Philadelphia `JSON-LD EntertainmentBusiness` has the placeholder data baked in. | `philadelphia.html:2756` | Regenerate after fix. |

### JSON sweep artifact (grep hits)
- `555` phone placeholders — **8 occurrences** (2 visible on contact.html, 6 in locations-data.json)
- `NEEDS REAL ADDRESS / NEEDS HOURS / NEEDS PHONE / NEEDS URL` — **17 occurrences** in locations-data.json
- `"state": "NE"` and visible "Lincoln, NE 68510" — 2 occurrences
- `123 Market Street` — 3 occurrences (JSON, locations hub, JSON-LD)

---

## 🔴 BLOCKER — Slug/Routing Mismatches

The new site has routing inconsistencies that will confuse SEO carryover and deep links:

| Thing | Old site | New site | Fix |
|---|---|---|---|
| Chicago slug | `/mountprospect` | `mount-prospect.html` (good) | Ensure `mountprospect` (no dash) → 301 redirect to `mount-prospect.html`. |
| West Nyack slug | `/west-nyack` | `west-nyack.html` (good) | ✓ |
| Lincoln slug | `/lincoln` | `lincoln.html` (good) | ✓ (once state fix applied) |
| Stale "Chicago" entry | — | `docs/locations-data.json` still has a `"id": "chicago"` block alongside `mount-prospect`. | Remove the `chicago` block or reconcile. |
| locations-data.json `"instagram/tiktok/facebook": "NEEDS URL"` | — | Global social URLs in the HTML are real (`instagram.com/timemission` etc.), but JSON is stale | Populate JSON from HTML. |

---

## 🟠 IMPORTANT — Missing Pages (Old site → New site parity)

The old site has **12 event-type landing pages** the new site collapsed into two buckets on `groups.html`. Whether this is intentional or needs dedicated SEO pages depends on how these pages rank today — worth a quick check in Search Console.

| Old URL | New equivalent | Decision |
|---|---|---|
| `/adult-birthday-parties` | `groups.html` section | ⚠ ok if not ranking |
| `/kids-birthday-party` | `groups.html` | ⚠ |
| `/bachelorette-party` | `groups.html` | ⚠ |
| `/date-night-ideas` | `groups.html` | ⚠ |
| `/corporate-events` | `groups.html` | ⚠ |
| `/team-building` | `groups.html` | ⚠ |
| `/school-field-trips` | `groups.html` | ⚠ |
| `/youth-group-camp` | `groups.html` | ⚠ |
| `/family-gathering` | `groups.html` | ⚠ |
| `/bus-tour` | **nothing** | ❓ Unique. Is this a real program? |
| **`/house-rules`** | `code-of-conduct.html` | ⚠ Content differs; see below |
| **`/licensing`** | **nothing** | 🔴 Franchise / corporate contact page gone |
| `/privacy-policy` | `privacy.html` | ✓ |
| `/terms-and-conditions` | `terms.html` | ✓ |

### Action for each
- If any of those event URLs are getting meaningful organic traffic, set up 301 redirects to the right section anchor of `groups.html` (#birthday, #corporate, etc.).
- `/licensing` contained **corporate contact info that's nowhere on the new site** — see Corporate Contacts below.
- `/bus-tour` — was this an active offering? If yes, we need coverage. If retired, 301 to `/groups.html`.

---

## 🔴 BLOCKER — Missing Corporate Contact Info

The old `/licensing` page exposes corporate addresses used for franchise / licensing / press inquiries. Nothing on the new site has these.

**Time Mission Corp Inc.**
- **USA Office:** 180 Mill Street, Cranston, RI 02905, USA  +1 401 321 4546  `info@timemission.com`
- **Europe Office:** Kruisakker 12, 5674 TZ Nuenen, Netherlands  `info@timemission.eu`

**Recommendation:** add a "Corporate" section on `contact.html` (or create `/licensing.html`) with these two offices + a "Licensing / Franchise Inquiries" block and a brochure download CTA (file doesn't exist yet — ask operations).

---

## 🟠 IMPORTANT — House Rules content gap

Old `/house-rules` has detailed rules; new `code-of-conduct.html` needs review to confirm coverage:

| Rule category (old site) | In new code-of-conduct? |
|---|---|
| Smoking Policy (incl. vapes/e-cigs) | ⚠ verify |
| Language and Behavior | ⚠ verify |
| Outside Food and Beverage | ⚠ verify |
| Dress Code (no heels, no baggy, athletic wear, no offensive attire) | ⚠ verify |
| Weapons Policy (no open carry except LE) | ⚠ verify |
| Filming and Photography Policy (personal vs commercial, consent) | ⚠ verify |
| Per-location rules + operator emails (6 operators) | ⚠ verify |

Do a side-by-side pass; the old content is legally meaningful (liability/consent). If any of it is missing, copy it over.

---

## 🟠 IMPORTANT — Experience room inventory

New `experiences.html` has **29 rooms**. Old site advertises **34 rooms** across "25+ different Portals". Missing from new site:

1. **PORTAL DISCOVERY** (the intro/tutorial room — likely important)
2. **PALEONTOLOGIST'S STUDY** (Year 1831)
3. **GENE VAULT**
4. **STAR STRUCK**
5. **HIVE ESCAPE**

Action: confirm whether those 5 are still live attractions. If yes, add to the grid. If they've been removed, update marketing copy ("25+" still accurate so no change needed) but verify.

---

## 🟠 IMPORTANT — Multi-language support

Old site offers: **US English / Spanish / Dutch**. New site is English-only.

- Spanish matters for US market reach
- Dutch is essential for **Antwerp** (Belgium — French/Dutch-speaking)

Not realistic for launch (needs real translation), but:
- At minimum, add `<html lang="nl">` variant of the Antwerp page with key translated strings, or
- Add a note on the Antwerp page acknowledging this, with operator contact in Dutch

Owner: Ari or a translator.

---

## 🟠 IMPORTANT — Messaging/copy alignment

- Old site tagline on `<title>`: **"Time Mission | The Clock is Ticking!"** — catchy, memorable. We don't use any equivalent. Consider adding.
- Old site voice consistent: "Teams of 2-5 players embark on a social gaming adventure through time to save the future. The Time Machine's energy core has been depleted..." — the "Momentium" terminology and "save the future" narrative exist on old site. Verify it's carried through or intentionally dropped.
- Old site explicitly calls out **ages 6 to 106** with the 6-13 kids-need-adult rule — our FAQ has the rule, worth adding the "6 to 106" copy where it fits.

---

## 🟠 IMPORTANT — Stray "Coming Soon" placeholders for cities we aren't launching

`houston.html`, `accessibility.html`, `mount-prospect.html` (and likely all location pages) reference "**Orland Park, IL**", "**Dallas, TX**", and "**Brussels, BE**" as Coming Soon locations. Confirm these are real plans or remove.

---

## 🟢 NICE-TO-HAVE — Other content present on old site

- Booking flow mentions "GIFT CARDS" prominently on every location page header — we have `gift-cards.html` but could add a nav-level link on location pages
- Old footer structure has clear info architecture: `Adult Groups` / `Kids & Family Groups` categories — if not carrying to CMS, worth preserving in sitemap mental model
- Old site uses `https://asset.timemission.com/website/` CDN subdomain — when Ari sets up hosting, ask whether we're keeping that or consolidating

---

## Automated Checks Status (Track 1)

| Check | Result |
|---|---|
| Broken internal links | None in main nav after earlier fixes |
| `href="#"` on real nav links | Only remaining are coming-soon city entries (VA: correct, they're Coming Soon tagged) |
| Missing alt attributes | None |
| JSON-LD parseability | Valid (but will contain wrong address until Philadelphia fix) |
| Sitemap valid | Yes, 20 URLs |
| robots.txt | Allows all except `_archive`, `test-results`, `.playwright-mcp` |
| Lighthouse desktop | index 97/100/100/100 |
| Lighthouse mobile | index 73/100/100/100 |

---

## Open questions for Jefferson / operators
(each needs a human answer before or shortly after launch)

- [ ] Real phone numbers / addresses / hours for each location — **most are now captured above from the old site** — just need operator confirmation that they're still current as of April 2026
- [ ] Houston: target open date, street, phone, email, hours (once known)
- [ ] Are the 5 missing experience rooms (Portal Discovery, Paleontologist's Study, Gene Vault, Star Struck, Hive Escape) still operating at any location?
- [ ] Is `/bus-tour` still a real offering?
- [ ] Is `/licensing` (franchise) still an active program? Brochure link target?
- [ ] Orland Park / Dallas / Brussels — are these real Coming Soon locations with a target date?
- [ ] Any SEO traffic worth preserving on the 12 old event-type landing pages? (pull from Search Console)
- [ ] Legal sign-off on privacy / terms / cookies / code-of-conduct / accessibility
- [ ] Corporate contact: should 180 Mill St Cranston / Kruisakker 12 Nuenen addresses appear on `contact.html`, or is there a newer address?
- [ ] Multi-language strategy: launch English-only, then add? Antwerp Dutch prioritized?

---

## Recommended next moves (in order)
1. **Fix the 6 location data sets** (address/phone/email/hours) using values above. ~30 min task. Update `docs/locations-data.json` AND the hardcoded text on each location page AND the philadelphia.html JSON-LD.
2. **Fix Lincoln state** (RI, not NE) — mechanical find-replace.
3. **Remove `chicago` ghost entry** from locations-data.json; align to `mount-prospect`.
4. **Add corporate contact block** to contact.html (US + EU offices).
5. **House Rules content audit** — diff old `/house-rules` against new `code-of-conduct.html`, port missing sections.
6. **Decide on event-type landing pages** — redirect plan for the 12 old URLs.
7. **Ping operators** with the open-question list above.
