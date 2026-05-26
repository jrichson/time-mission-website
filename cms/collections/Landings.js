const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const assetPathUnsafeRegex = /[<>"'\\\s]/;

const CLOUDFLARE_DEPLOY_HOOK_TIMEOUT_MS = 15_000;
const landingTemplateOptions = [
  {
    label: 'Paid/Social Campaign - Ad or social campaign',
    value: 'paid_social_campaign',
  },
  {
    label: 'Local Venue/City - Local venue or city campaign',
    value: 'local_venue_city',
  },
  {
    label: 'Group/Event - Group or event landing',
    value: 'group_event',
  },
];

const legacyLandingTemplateOptions = [
  {
    legacyValue: 'campaign',
    mapsTo: 'paid_social_campaign',
  },
  {
    legacyValue: 'location_promo',
    mapsTo: 'local_venue_city',
  },
  {
    legacyValue: 'coming_soon',
    mapsTo: 'local_venue_city',
  },
];
const legacyTemplateNote = legacyLandingTemplateOptions
  .map((option) => `${option.legacyValue} -> ${option.mapsTo}`)
  .join(', ');

function validateAssetPath(val) {
  if (typeof val !== 'string' || !val.startsWith('/assets/')) {
    return 'Must be a root-relative path starting with /assets/';
  }
  if (val.includes('://') || val.includes('..') || assetPathUnsafeRegex.test(val)) {
    return 'Invalid image path';
  }
  return true;
}

function validateHttpsUrl(val, label) {
  if (typeof val !== 'string') return `${label} must be an https URL`;
  if (val.length > 2048) return `${label} is too long`;

  let url;
  try {
    url = new URL(val);
  } catch {
    return `${label} must be a valid URL`;
  }

  if (url.protocol !== 'https:') return `${label} must use https`;
  if (url.username || url.password) return `${label} must not include credentials`;
  return true;
}

function deployHookURL() {
  const value = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
  if (!value) {
    console.warn('[landings] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL unset');
    return null;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    console.warn('[landings] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is invalid');
    return null;
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    console.warn('[landings] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL must be a credential-free https URL');
    return null;
  }

  return url.toString();
}

function triggerPagesDeploy(reason) {
  const url = deployHookURL();
  if (!url) {
    return;
  }
  void fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(CLOUDFLARE_DEPLOY_HOOK_TIMEOUT_MS),
  }).then(
    (res) =>
      console.log('[landings] Cloudflare Pages hook:', reason, res.status),
    (err) => console.error('[landings] Cloudflare Pages hook failed:', err),
  );
}

function userRole(user) {
  return user?.role;
}

function isAdminOrEditor(user) {
  const role = userRole(user);
  return role === 'admin' || role === 'editor';
}

function canManageLandings({ req: { user } }) {
  if (!user || user.collection !== 'users') return false;

  return isAdminOrEditor(user);
}

function landingPreviewPath(doc) {
  if (!doc?.id) return null;
  return `/preview/landings/${encodeURIComponent(String(doc.id))}`;
}

function templateIs(...templates) {
  return (data, siblingData) => templates.includes(siblingData?.template ?? data?.template);
}

function launchStateIsComingSoon(data) {
  return data?.template === 'coming_soon' || data?.strategy?.launchState === 'coming_soon';
}

export const Landings = {
  slug: 'landings',
  labels: {
    singular: 'Landing Page',
    plural: 'Landing Pages',
  },
  admin: {
    group: 'Pages',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'template', 'published', 'content.ctaSurface', 'updatedAt'],
    components: {
      beforeList: ['/components/LandingWizardDashboard.tsx'],
    },
    description:
      'Campaign, local venue, and group/event pages rendered under /c/{page-url}. Use the Landing launch wizard for new drafts, then refine details here before publishing.',
    preview: landingPreviewPath,
  },
  access: {
    admin: canManageLandings,
    read: ({ req }) => (canManageLandings({ req }) ? true : { published: { equals: true } }),
    create: canManageLandings,
    update: canManageLandings,
    delete: canManageLandings,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          maxLength: 120,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          label: 'Page URL',
          admin: { description: 'The public URL segment after /c/. Use lowercase words and hyphens, such as summer-adventures.' },
          validate: (val) => {
            if (typeof val !== 'string' || !slugRegex.test(val)) {
              return 'Slug must match ^[a-z0-9-]+$ (no leading/trailing hyphens)';
            }
            return true;
          },
        },
      ],
    },
    {
      name: 'template',
      type: 'select',
      required: true,
      defaultValue: 'paid_social_campaign',
      options: landingTemplateOptions,
      admin: {
        position: 'sidebar',
        description:
          `Choose the landing shape after the brief is clear. Paid/social is booking-first, local venue/city is place-first, and group/event is planner-first. Legacy values normalize internally: ${legacyTemplateNote}.`,
      },
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      label: 'Published in CMS',
      admin: {
        position: 'sidebar',
        description: 'Published in CMS means approved. It is Live after deploy when the static public site rebuilds.',
      },
    },
    {
      name: 'includeInSitemap',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'If off, the page can still exist but will be omitted from sitemap.xml.',
      },
    },
    {
      name: 'brief',
      type: 'group',
      label: 'Campaign brief',
      admin: {
        description:
          'Anchor the landing page to the request that created it. This prevents strategy, copy, and proof points from living in a vacuum.',
      },
      fields: [
        {
          name: 'sourceChannel',
          type: 'select',
          defaultValue: 'paid_ad',
          options: [
            { label: 'Paid ad', value: 'paid_ad' },
            { label: 'Organic social', value: 'organic_social' },
            { label: 'Email', value: 'email' },
            { label: 'Local search / SEO', value: 'local_search' },
            { label: 'Partner / referral', value: 'partner' },
            { label: 'Internal campaign', value: 'internal' },
            { label: 'Other', value: 'other' },
          ],
          admin: { description: 'Where is the visitor coming from before this landing page?' },
        },
        {
          name: 'sourceName',
          type: 'text',
          maxLength: 120,
          admin: { description: 'Name the actual source. Example: Meta summer campaign, birthdays email, Houston launch post.' },
        },
        {
          name: 'sourceUrl',
          type: 'text',
          maxLength: 2048,
          admin: { description: 'Optional https link to the ad, post, email preview, campaign doc, or source page.' },
          validate: (val) => {
            if (val == null || val === '') return true;
            return validateHttpsUrl(val, 'Source/reference URL');
          },
        },
        {
          name: 'sourcePromise',
          type: 'textarea',
          maxLength: 280,
          admin: { description: 'What did the source promise before the visitor clicked? The landing headline should match this closely.' },
        },
        {
          name: 'visitorIntent',
          type: 'textarea',
          maxLength: 240,
          admin: { description: 'What is the visitor likely trying to decide or accomplish when they arrive?' },
        },
        {
          name: 'successMetric',
          type: 'text',
          maxLength: 120,
          admin: { description: 'How will this page be judged? Example: bookings, event inquiries, waitlist/contact submissions, gift-card clicks.' },
        },
      ],
    },
    {
      name: 'strategy',
      type: 'group',
      label: 'Marketing strategy',
      admin: {
        description:
          'Translate the brief into page strategy: who it is for, why they should care, and what proof makes the claim believable.',
      },
      fields: [
        {
          name: 'audience',
          type: 'text',
          maxLength: 120,
          admin: { description: 'Who is this for? Example: parents planning teen birthdays, Friday-night friend groups, or corporate event buyers.' },
        },
        {
          name: 'campaignGoal',
          type: 'textarea',
          maxLength: 240,
          admin: { description: 'What behavior should this page drive? Example: book tickets, request event help, or join opening updates.' },
        },
        {
          name: 'offerType',
          type: 'text',
          maxLength: 120,
          admin: { description: 'The concrete offer or occasion. Example: summer outing, grand opening, corporate team building, or birthday package.' },
        },
        {
          name: 'locationOrCity',
          type: 'text',
          maxLength: 120,
          admin: { description: 'Required for local venue/city pages. Example: Philadelphia, Houston, or Dallas.' },
        },
        {
          name: 'eventType',
          type: 'text',
          maxLength: 120,
          admin: { description: 'Required for group/event pages. Example: birthday, corporate outing, field trip, or private event.' },
        },
        {
          name: 'launchState',
          type: 'select',
          defaultValue: 'open',
          options: [
            { label: 'Open for booking', value: 'open' },
            { label: 'Coming soon', value: 'coming_soon' },
          ],
          admin: { description: 'Coming-soon pages should use contact or updates language instead of immediate booking.' },
        },
        {
          name: 'proofAngle',
          type: 'textarea',
          maxLength: 240,
          admin: { description: 'What makes the claim believable? Use real proof: venue photos, mission count, logistics, press, or planner confidence.' },
        },
        {
          name: 'ctaIntent',
          type: 'text',
          maxLength: 120,
          admin: { description: 'Plain-language next step. Example: Book tickets, request event help, view locations, or ask for opening updates.' },
        },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO',
      fields: [
        {
          name: 'metaTitle',
          type: 'text',
          required: true,
          maxLength: 90,
          admin: { description: 'Browser title and social share title. Keep the core offer and Time Mission visible.' },
        },
        {
          name: 'metaDescription',
          type: 'textarea',
          required: true,
          maxLength: 220,
          admin: { description: 'Short search/social summary. State who it is for, what they get, and why it is worth acting on.' },
        },
        {
          name: 'robots',
          type: 'select',
          defaultValue: 'index,follow',
          options: [
            { label: 'index, follow', value: 'index,follow' },
            { label: 'noindex, follow', value: 'noindex,follow' },
          ],
        },
        {
          name: 'canonicalOverride',
          type: 'text',
          admin: {
            description:
              'Optional full https URL on timemission.com; leave empty for default https://timemission.com/c/{slug}',
          },
          validate: (val) => {
            if (val == null || val === '') return true;
            if (typeof val !== 'string') return 'Canonical must be empty or an https URL on timemission.com';
            const s = val.trim();
            let u;
            try {
              u = new URL(s);
            } catch {
              return 'Canonical must be a valid URL';
            }
            if (u.protocol !== 'https:') return 'Canonical override must use https';
            if (u.username || u.password) return 'Canonical URL must not include credentials';
            const host = u.hostname.toLowerCase();
            if (host !== 'timemission.com' && host !== 'www.timemission.com') {
              return 'Canonical must be timemission.com or www.timemission.com';
            }
            return true;
          },
        },
        {
          name: 'ogImage',
          type: 'text',
          required: true,
          label: 'Hero / social image',
          admin: { description: 'Root-relative /assets/... path. Use real venue or experience photography, not abstract artwork.' },
          validate: validateAssetPath,
        },
        {
          name: 'twitterImage',
          type: 'text',
          admin: { description: 'Defaults to og:image if empty' },
          validate: (val) => {
            if (val == null || val === '') return true;
            return validateAssetPath(val);
          },
        },
      ],
    },
    {
      name: 'content',
      type: 'group',
      label: 'Shared landing content',
      admin: {
        description:
          'These fields appear across all templates. Match the page headline to the visitor promise, use concrete proof points, and keep one clear primary action.',
      },
      fields: [
        {
          name: 'headline',
          type: 'text',
          required: true,
          maxLength: 160,
          admin: { description: 'Lead with the promise. This should closely match the campaign brief source promise.' },
        },
        {
          name: 'subheadline',
          type: 'textarea',
          maxLength: 360,
          admin: { description: 'Reduce uncertainty. Explain the experience, occasion, or local reason to act in one or two sentences.' },
        },
        {
          name: 'bullets',
          type: 'array',
          minRows: 0,
          maxRows: 12,
          labels: { singular: 'Proof point', plural: 'Proof points' },
          admin: { description: 'Use concrete reasons to believe: mission count, group fit, real logistics, location confidence, or planner reassurance.' },
          fields: [{ name: 'text', type: 'text', required: true, maxLength: 200 }],
        },
        {
          name: 'primaryCtaLabel',
          type: 'text',
          required: true,
          maxLength: 80,
          admin: { description: 'Use a verb-first CTA. Examples: Book Now, Request Event Help, Visit Philadelphia, Ask About Opening Updates.' },
        },
        {
          name: 'ctaSurface',
          type: 'select',
          required: true,
          defaultValue: 'book_panel',
          options: [
            { label: 'Open booking (ticket panel)', value: 'book_panel' },
            { label: 'Missions page', value: 'missions' },
            { label: 'Groups hub', value: 'groups' },
            { label: 'Contact page', value: 'contact' },
            { label: 'Gift cards', value: 'gift_cards' },
            { label: 'External URL', value: 'external' },
          ],
          admin: {
            description:
              'Default guidance: paid/social and open local pages usually book; group/event and coming-soon pages usually contact.',
          },
        },
        {
          name: 'ctaExternalUrl',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.ctaSurface === 'external',
            description: 'https://... when CTA surface is External',
          },
          validate: (val, { siblingData } = {}) => {
            if (siblingData?.ctaSurface !== 'external') return true;
            return validateHttpsUrl(val, 'External CTA');
          },
        },
      ],
    },
    {
      name: 'paidSocial',
      type: 'group',
      label: 'Paid/social campaign guidance',
      admin: {
        condition: templateIs('paid_social_campaign', 'campaign'),
        description:
          'Ad or social campaign: hook fast, match the source promise, reduce activation energy, and avoid fake urgency.',
      },
      fields: [
        {
          name: 'sourcePromise',
          type: 'textarea',
          maxLength: 240,
          admin: { description: 'What did the ad, post, or email promise before the visitor landed here?' },
        },
        {
          name: 'frictionReducer',
          type: 'textarea',
          maxLength: 240,
          admin: { description: 'What makes the first action easy? Example: quick booking, all ages, groups welcome, or no planning required.' },
        },
      ],
    },
    {
      name: 'localVenue',
      type: 'group',
      label: 'Local venue/city guidance',
      admin: {
        condition: templateIs('local_venue_city', 'location_promo', 'coming_soon'),
        description:
          'Local venue or city campaign: make the place feel real, show venue confidence, and give local visitors a reason to act.',
      },
      fields: [
        {
          name: 'cityProof',
          type: 'textarea',
          maxLength: 240,
          admin: { description: 'What local detail makes this page feel specific to the city or venue?' },
        },
        {
          name: 'venueConfidence',
          type: 'textarea',
          maxLength: 240,
          admin: { description: 'What reassures visitors this is a real, polished venue worth visiting?' },
        },
        {
          name: 'openingNote',
          type: 'textarea',
          maxLength: 240,
          admin: {
            condition: launchStateIsComingSoon,
            description: 'For coming-soon pages, explain what visitors can expect and how they can get updates.',
          },
        },
      ],
    },
    {
      name: 'groupEvent',
      type: 'group',
      label: 'Group/event guidance',
      admin: {
        condition: templateIs('group_event'),
        description:
          'Group or event landing: reassure the planner, reduce regret risk, and make logistics feel handled.',
      },
      fields: [
        {
          name: 'plannerReassurance',
          type: 'textarea',
          maxLength: 240,
          admin: { description: 'What does the planner need to feel confident before contacting Time Mission?' },
        },
        {
          name: 'groupSize',
          type: 'text',
          maxLength: 120,
          admin: { description: 'Suggested group-size framing. Example: small crews, birthday groups, school groups, or full-venue buyouts.' },
        },
        {
          name: 'logisticsNote',
          type: 'textarea',
          maxLength: 240,
          admin: { description: 'Mention handled details where true: run-of-show, scoring, private space, catering, or event help.' },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, previousDoc }) => {
        const pub = Boolean(doc?.published);
        const wasPub = Boolean(previousDoc?.published);
        if (pub || wasPub) triggerPagesDeploy('landing-change');
      },
    ],
    afterDelete: [
      ({ doc }) => {
        if (Boolean(doc?.published)) {
          triggerPagesDeploy('landing-delete');
        }
      },
    ],
  },
};
