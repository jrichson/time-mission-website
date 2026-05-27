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
  if (doc?.content?.ctaSurface === 'external' && !safeExternalLandingHref(doc.content.ctaExternalUrl)) {
    warnings.push('Add a credential-free https external CTA URL before publishing.');
  }
  if (landingLaunchStateForDoc(doc) === 'coming_soon' && doc?.content?.ctaSurface === 'book_panel') {
    warnings.push('Coming-soon pages should use contact or updates language instead of immediate booking.');
  }

  return warnings;
}
