export const LANDING_TEMPLATE_OPTIONS = [
  {
    value: 'paid_social_campaign',
    label: 'Paid/Social Campaign',
    help: 'A matching destination for an ad, post, email, or seasonal offer.',
    bestFor: 'One promise, one primary booking action, fast proof.',
    creates: ['Campaign hero', 'Proof cards', 'Friction reducers', 'Booking CTA'],
  },
  {
    value: 'local_venue_city',
    label: 'Local Venue/City',
    help: 'A city, venue opening, local SEO push, or place-specific offer.',
    bestFor: 'Place-first demand where the city or venue has to feel real.',
    creates: ['City signal', 'Venue confidence', 'Launch-state copy', 'Local CTA'],
  },
  {
    value: 'group_event',
    label: 'Group/Event',
    help: 'A buyer or planner page for birthdays, corporate outings, schools, or private events.',
    bestFor: 'Planner confidence, logistics reassurance, and inquiry-friendly conversion.',
    creates: ['Planner promise', 'Logistics proof', 'Group-size framing', 'Inquiry CTA'],
  },
];

export const LEGACY_LANDING_TEMPLATE_OPTIONS = [
  { legacyValue: 'campaign', mapsTo: 'paid_social_campaign' },
  { legacyValue: 'location_promo', mapsTo: 'local_venue_city' },
  { legacyValue: 'coming_soon', mapsTo: 'local_venue_city' },
];

export const SOURCE_CHANNEL_OPTIONS = [
  { value: 'paid_ad', label: 'Paid ad' },
  { value: 'organic_social', label: 'Organic social' },
  { value: 'email', label: 'Email' },
  { value: 'local_search', label: 'Local search / SEO' },
  { value: 'partner', label: 'Partner / referral' },
  { value: 'internal', label: 'Internal campaign' },
  { value: 'other', label: 'Other' },
];

export const LANDING_CAMPAIGN_PRESETS = [
  {
    id: 'friends-night-out',
    template: 'paid_social_campaign',
    label: 'Friends Night Out',
    meta: 'Paid/social',
    intent: 'Fast booking page for date-night, weekend, and local social traffic.',
    defaults: {
      audience: 'Couples and local friend groups',
      ctaSurface: 'book_panel',
      eventType: '',
      groupSize: '',
      headline: 'Turn Tonight Into a Mission Together',
      launchState: 'open',
      locationOrCity: '',
      offerType: 'Night-out ticket booking',
      ogImage: '/assets/photos/experiences/ready-to-play-1200.webp',
      primaryCtaLabel: 'Book Your Mission',
      proofPoints: [
        '25+ interactive mission rooms',
        'Teams compete together in real time',
        '60, 90, and 120 minute sessions',
      ],
      slug: 'friends-night-out',
      sourceChannel: 'paid_ad',
      sourceName: 'Friends night out campaign',
      sourcePromise: 'A high-energy indoor challenge for friends who want something more memorable than dinner or drinks.',
      subheadline: 'Compete through interactive rooms, chase the scoreboard, and book a session that gives the whole group something to talk about.',
      successMetric: 'Ticket bookings',
      title: 'Friends Night Out at Time Mission',
      visitorIntent: 'They are comparing fun night-out ideas and need to know this is easy to book, active, and worth choosing tonight.',
    },
  },
  {
    id: 'birthday-party-missions',
    template: 'group_event',
    label: 'Birthday Parties',
    meta: 'Group/event',
    intent: 'Planner-first page for birthday hosts who need confidence before asking.',
    defaults: {
      audience: 'Birthday hosts and parents',
      ctaSurface: 'contact',
      eventType: 'Birthday party',
      groupSize: 'Kids, teens, adults, and mixed-age birthday groups',
      headline: 'Birthday Parties Built Around the Mission',
      launchState: 'open',
      locationOrCity: '',
      offerType: 'Birthday party',
      ogImage: '/assets/photos/TM-Groups-1200.webp',
      primaryCtaLabel: 'Request Birthday Help',
      proofPoints: [
        'Mission rooms keep the group moving',
        'Scoring gives every guest a role',
        'Event help points planners to the right path',
      ],
      slug: 'birthday-party-missions',
      sourceChannel: 'paid_ad',
      sourceName: 'Birthday group campaign',
      sourcePromise: 'An active birthday plan with missions, scoring, and a shared win for the whole group.',
      subheadline: 'Give the guest of honor a competitive, high-energy experience while Time Mission helps point your group toward the right event path.',
      successMetric: 'Birthday event inquiries',
      title: 'Birthday Parties at Time Mission',
      visitorIntent: 'Parents or hosts are deciding whether this is easy to plan and exciting enough for the guest of honor.',
    },
  },
  {
    id: 'corporate-team-building',
    template: 'group_event',
    label: 'Corporate Team Building',
    meta: 'Group/event',
    intent: 'Inquiry page for teams comparing active offsite and private-event ideas.',
    defaults: {
      audience: 'Managers, HR teams, and event planners',
      ctaSurface: 'contact',
      eventType: 'Corporate team building',
      groupSize: 'Small departments, cross-functional teams, and private-event groups',
      headline: 'Team Building That Gets People Moving',
      launchState: 'open',
      locationOrCity: '',
      offerType: 'Corporate team building',
      ogImage: '/assets/photos/groups/corporate-events-1200.webp',
      primaryCtaLabel: 'Request Team Event Help',
      proofPoints: [
        'Shared missions create natural collaboration',
        'Scoring gives teams a clear finish line',
        'Private-event help supports larger groups',
      ],
      slug: 'corporate-team-building',
      sourceChannel: 'paid_ad',
      sourceName: 'Corporate team building campaign',
      sourcePromise: 'A team outing that feels active, structured, and easier to plan than another passive event.',
      subheadline: 'Bring the team into interactive mission rooms where collaboration, momentum, and friendly competition happen without forcing another conference-room activity.',
      successMetric: 'Corporate event inquiries',
      title: 'Corporate Team Building at Time Mission',
      visitorIntent: 'A planner is deciding whether Time Mission can handle the group and make the outing feel worthwhile.',
    },
  },
  {
    id: 'grand-opening-updates',
    template: 'local_venue_city',
    label: 'Grand Opening Updates',
    meta: 'Local venue',
    intent: 'Coming-soon page for local search, PR, and opening-interest traffic.',
    defaults: {
      audience: 'Local families, friends, and group planners',
      ctaSurface: 'contact',
      eventType: '',
      groupSize: '',
      headline: 'Be First Into the New Mission',
      launchState: 'coming_soon',
      locationOrCity: 'New city',
      offerType: 'Grand opening',
      ogImage: '/assets/photos/venue/_Time-Mission_0078-1200.webp',
      primaryCtaLabel: 'Ask About Opening Updates',
      proofPoints: [
        'Real venue photography and local details',
        'Opening-state copy sets the right expectation',
        'Contact path captures interested local visitors',
      ],
      slug: 'grand-opening-updates',
      sourceChannel: 'local_search',
      sourceName: 'Grand opening local campaign',
      sourcePromise: 'Opening updates for a new Time Mission venue, with the clearest path to ask questions before booking starts.',
      subheadline: 'Get the first details on the new Time Mission location, then come back ready to book when sessions open.',
      successMetric: 'Opening update inquiries',
      title: 'Grand Opening Updates at Time Mission',
      visitorIntent: 'Local visitors are checking whether the venue is real, when it opens, and how to hear about first availability.',
    },
  },
  {
    id: 'opening-offer-form',
    template: 'local_venue_city',
    label: 'Opening Offer Signup',
    meta: 'Form lead',
    intent: 'Lead-capture page for coming-soon locations with a specific opening offer.',
    defaults: {
      audience: 'Local visitors interested in opening offers',
      ctaSurface: 'contact',
      eventType: '',
      groupSize: '',
      headline: 'Get the Opening Offer First',
      launchState: 'coming_soon',
      locationOrCity: 'New city',
      offerType: 'Opening offer',
      ogImage: '/assets/photos/venue/_Time-Mission_0024-1200.webp',
      primaryCtaLabel: 'Join the Opening Offer List',
      proofPoints: [
        'Offer-specific signup intent',
        'Coming-soon copy avoids premature booking',
        'Contact path captures local interest',
      ],
      slug: 'opening-offer-signup',
      sourceChannel: 'paid_ad',
      sourceName: 'Opening offer form campaign',
      sourcePromise: 'A local opening offer for visitors who want early access before ticket booking is fully available.',
      subheadline: 'Share your interest now, get the offer details when they are ready, and be first in line when the new Time Mission opens.',
      successMetric: 'Opening offer form submissions',
      title: 'Opening Offer Signup at Time Mission',
      visitorIntent: 'They are interested in a specific opening offer and need a simple form path without being pushed into booking too early.',
    },
  },
  {
    id: 'general-ticket-booking',
    template: 'paid_social_campaign',
    label: 'General Ticket Booking',
    meta: 'General',
    intent: 'Reusable booking-first page when the source is broad or not audience-specific.',
    defaults: {
      audience: 'First-time Time Mission visitors',
      ctaSurface: 'book_panel',
      eventType: '',
      groupSize: '',
      headline: 'Book Your Time Mission Adventure',
      launchState: 'open',
      locationOrCity: '',
      offerType: 'General ticket booking',
      ogImage: '/assets/photos/experiences/experiences-hero-1280.webp',
      primaryCtaLabel: 'Book Tickets',
      proofPoints: [
        '25+ interactive mission rooms',
        'Team-based scoring and competition',
        'Flexible session lengths',
      ],
      slug: 'book-time-mission',
      sourceChannel: 'internal',
      sourceName: 'General booking campaign',
      sourcePromise: 'An easy path to understand Time Mission and book tickets without extra planning.',
      subheadline: 'Choose a session, bring your team, and compete through interactive mission rooms built for momentum from the first minute.',
      successMetric: 'Ticket bookings',
      title: 'Book Time Mission',
      visitorIntent: 'They want the fastest clear path from interest to tickets.',
    },
  },
  {
    id: 'general-group-inquiry',
    template: 'group_event',
    label: 'General Group Inquiry',
    meta: 'General',
    intent: 'Reusable planner-first page for any group or private-event lead.',
    defaults: {
      audience: 'Group planners',
      ctaSurface: 'contact',
      eventType: 'Group event',
      groupSize: 'Small crews, large groups, and private events',
      headline: 'Plan a Group Event With a Mission',
      launchState: 'open',
      locationOrCity: '',
      offerType: 'Group event',
      ogImage: '/assets/photos/TM-Groups-1200.webp',
      primaryCtaLabel: 'Request Group Help',
      proofPoints: [
        'Interactive rooms keep everyone active',
        'Scoring gives the group a shared goal',
        'Event help points planners to the right fit',
      ],
      slug: 'group-event-inquiry',
      sourceChannel: 'internal',
      sourceName: 'General group inquiry',
      sourcePromise: 'A clearer path for groups that need help choosing the right Time Mission event option.',
      subheadline: 'Tell us what you are planning and we will point your group toward the right mission path, session length, and next step.',
      successMetric: 'Group inquiries',
      title: 'Group Events at Time Mission',
      visitorIntent: 'They are planning for multiple people and need confidence that the logistics will be manageable.',
    },
  },
  {
    id: 'local-venue-booking',
    template: 'local_venue_city',
    label: 'Local Venue Booking',
    meta: 'General',
    intent: 'Reusable city or venue page when the location is open and ready for bookings.',
    defaults: {
      audience: 'Local visitors',
      ctaSurface: 'book_panel',
      eventType: '',
      groupSize: '',
      headline: 'Your Local Time Mission Is Ready',
      launchState: 'open',
      locationOrCity: 'Your city',
      offerType: 'Local venue visit',
      ogImage: '/assets/photos/venue/_Time-Mission_0042-1200.webp',
      primaryCtaLabel: 'Book This Location',
      proofPoints: [
        'Location-specific proof and imagery',
        'Clear booking path for local visitors',
        'Real venue details reduce uncertainty',
      ],
      slug: 'local-time-mission',
      sourceChannel: 'local_search',
      sourceName: 'Local venue booking campaign',
      sourcePromise: 'A local Time Mission page that makes the venue feel real and easy to book.',
      subheadline: 'See why local visitors choose Time Mission, then book the session that fits your crew.',
      successMetric: 'Local ticket bookings',
      title: 'Local Time Mission Booking',
      visitorIntent: 'They searched for a nearby activity and need proof this location is real, open, and worth booking.',
    },
  },
  {
    id: 'gift-card-campaign',
    template: 'paid_social_campaign',
    label: 'Gift Card Campaign',
    meta: 'General',
    intent: 'Reusable gift-card page for holidays, birthdays, rewards, and last-minute gifting.',
    defaults: {
      audience: 'Gift buyers',
      ctaSurface: 'gift_cards',
      eventType: '',
      groupSize: '',
      headline: 'Give Them a Mission to Remember',
      launchState: 'open',
      locationOrCity: '',
      offerType: 'Gift cards',
      ogImage: '/assets/logo/tm-gift-card-1280.webp',
      primaryCtaLabel: 'Buy Gift Cards',
      proofPoints: [
        'Works for birthdays, holidays, and rewards',
        'Experience gift instead of another item',
        'Fast path to the gift-card page',
      ],
      slug: 'time-mission-gift-cards',
      sourceChannel: 'internal',
      sourceName: 'Gift card campaign',
      sourcePromise: 'A gift that gives someone an active, competitive Time Mission experience.',
      subheadline: 'Send an experience they can use for missions, competition, and a visit that feels more memorable than another thing.',
      successMetric: 'Gift-card clicks',
      title: 'Time Mission Gift Cards',
      visitorIntent: 'They need a simple gift idea and want to know it feels personal enough to buy now.',
    },
  },
];

export const CTA_SURFACE_OPTIONS = [
  { value: 'book_panel', label: 'Open booking panel' },
  { value: 'contact', label: 'Contact / inquiry' },
  { value: 'groups', label: 'Groups hub' },
  { value: 'missions', label: 'Missions page' },
  { value: 'gift_cards', label: 'Gift cards' },
  { value: 'external', label: 'External URL' },
];

const internalCtaHrefs = {
  contact: '/contact',
  gift_cards: '/gift-cards',
  groups: '/groups',
  missions: '/missions',
};

const templatePayloadGuidance = {
  paid_social_campaign: 'Ad or social campaign',
  local_venue_city: 'Local venue or city campaign',
  group_event: 'Group or event landing',
};

const EXTERNAL_URL_MAX_LENGTH = 2048;

export function payloadLandingTemplateOptions() {
  return LANDING_TEMPLATE_OPTIONS.map(({ label, value }) => ({
    label: `${label} - ${templatePayloadGuidance[value]}`,
    value,
  }));
}

export function landingCampaignPreset(value) {
  return LANDING_CAMPAIGN_PRESETS.find((preset) => preset.id === value) || null;
}

export function legacyTemplateNote() {
  return LEGACY_LANDING_TEMPLATE_OPTIONS.map((option) => `${option.legacyValue} -> ${option.mapsTo}`).join(', ');
}

function optionValue(options, value, fallback) {
  return options.some((option) => option.value === value) ? value : fallback;
}

export function landingTemplate(value) {
  return optionValue(LANDING_TEMPLATE_OPTIONS, value, 'paid_social_campaign');
}

export function landingSourceChannel(value) {
  return optionValue(SOURCE_CHANNEL_OPTIONS, value, 'paid_ad');
}

export function landingLaunchState(value) {
  return value === 'coming_soon' ? 'coming_soon' : 'open';
}

export function landingArchetypeForDoc(doc) {
  if (doc?.template === 'group_event') return 'group_event';
  if (doc?.template === 'local_venue_city' || doc?.template === 'location_promo' || doc?.template === 'coming_soon') {
    return 'local_venue_city';
  }
  return 'paid_social_campaign';
}

export function landingTemplateLabel(template) {
  return LANDING_TEMPLATE_OPTIONS.find((option) => option.value === template)?.label || 'Paid/Social Campaign';
}

export function landingLaunchStateForDoc(doc) {
  if (doc?.template === 'coming_soon') return 'coming_soon';
  return doc?.strategy?.launchState === 'coming_soon' ? 'coming_soon' : 'open';
}

export function defaultLandingCtaSurface(template, state) {
  if (template === 'group_event' || state === 'coming_soon') return 'contact';
  return 'book_panel';
}

export function landingCtaSurface(value, template, state) {
  return optionValue(CTA_SURFACE_OPTIONS, value, defaultLandingCtaSurface(template, state));
}

export function defaultLandingCtaLabel(template, state) {
  if (state === 'coming_soon') return 'Ask About Opening Updates';
  if (template === 'group_event') return 'Request Event Help';
  if (template === 'local_venue_city') return 'Book This Location';
  return 'Book Now';
}

export function safeExternalLandingHref(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.length > EXTERNAL_URL_MAX_LENGTH || /[<>"'\\\s]/.test(raw)) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function validHttpsUrl(value) {
  return !value || Boolean(safeExternalLandingHref(value));
}

export function landingCtaForDoc(doc) {
  const fallbackSurface = defaultLandingCtaSurface(landingArchetypeForDoc(doc), landingLaunchStateForDoc(doc));
  const surface = optionValue(CTA_SURFACE_OPTIONS, doc?.content?.ctaSurface, fallbackSurface);
  if (surface === 'book_panel') {
    return { surface, primaryHref: '#tickets', bookTrigger: true, linkPath: '/tickets' };
  }
  if (surface !== 'external') {
    const href = internalCtaHrefs[surface] || '/missions';
    return { surface, primaryHref: href, bookTrigger: false, linkPath: href };
  }

  const primaryHref = safeExternalLandingHref(doc?.content?.ctaExternalUrl);
  if (!primaryHref) {
    return { surface: 'missions', primaryHref: '/missions', bookTrigger: false, linkPath: '/missions' };
  }

  return {
    surface,
    primaryHref,
    bookTrigger: false,
    linkPath: new URL(primaryHref).pathname || '/',
  };
}

export function slugifyLandingPath(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

export function truncateLandingText(value, maxLength) {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 1).replace(/\s+\S*$/, '').trimEnd();
}

export function landingShouldAppearInSitemap(doc) {
  if (doc?.includeInSitemap === false) return false;
  if (doc?.seo?.robots === 'noindex,follow') return false;
  return Boolean(doc?.slug && doc?.seo?.metaTitle && doc?.seo?.metaDescription && doc?.seo?.ogImage && doc?.content?.headline && doc?.content?.primaryCtaLabel);
}

export function landingReviewWarningsForDoc(doc) {
  const warnings = [];
  const bullets = doc?.content?.bullets?.filter((bullet) => String(bullet?.text || '').trim()).length ?? 0;
  const sourcePromise = String(doc?.brief?.sourcePromise || '').trim();
  const visitorIntent = String(doc?.brief?.visitorIntent || '').trim();

  if (!sourcePromise) warnings.push('Add the source promise from the ad, post, email, search query, or campaign request.');
  if (!visitorIntent) warnings.push('Add the visitor intent so the page copy is tied to a real decision path.');
  if (!doc?.content?.subheadline) warnings.push('Add a subheadline so visitors understand the offer before they choose.');
  if (bullets < 3) warnings.push('Add at least three concrete proof points.');
  if (/^(learn more|submit|click here)$/i.test(String(doc?.content?.primaryCtaLabel || '').trim())) {
    warnings.push('Use a verb-first CTA that names the action, such as Book Your Mission or Request Event Help.');
  }
  if (doc?.content?.ctaSurface === 'external' && !safeExternalLandingHref(doc.content.ctaExternalUrl)) {
    warnings.push('Add a credential-free https external CTA URL before publishing.');
  }
  if (landingLaunchStateForDoc(doc) === 'coming_soon' && doc?.content?.ctaSurface === 'book_panel') {
    warnings.push('Coming-soon pages should use contact or updates language instead of immediate booking.');
  }

  return warnings;
}
