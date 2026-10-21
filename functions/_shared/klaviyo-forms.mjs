/**
 * Klaviyo embed forms and their first-party backups.
 *
 * Every Klaviyo embed on the site renders a hidden backup form from this registry. The
 * backup appears when Klaviyo's script is blocked and posts to /api/klaviyo-signup, which
 * subscribes the visitor to the same list. The server only trusts list IDs from here.
 * Fields, button text, and consent wording mirror the live Klaviyo form.
 *
 * The US and EU sites use separate Klaviyo accounts. Each Pages project holds its own
 * KLAVIYO_API_KEY, so a form may only be submitted on the site whose account owns its list.
 */

export const KLAVIYO_ACCOUNTS = Object.freeze({
  us: 'TNQysU',
  eu: 'YccPJs',
});

const EDUCATOR_CONSENT = 'By submitting this form, you agree to receive your promo code and related emails from Time Mission, including marketing emails such as field trip and group information. Consent is not a condition of purchase. You can unsubscribe at any time using the link in any email.';
const EDUCATOR_SUCCESS = {
  title: 'Submitted ✅ Thank you',
  text: "Check your email for your unique booking link. It can take up to 10 minutes, so check your spam folder if you don't see it. Don't share or forward the link, it only works once.",
};

const EDUCATOR_FIELDS = [
  { name: 'given_name', label: 'First Name', type: 'text', autocomplete: 'given-name', klaviyo: 'first_name' },
  { name: 'family_name', label: 'Last Name', type: 'text', autocomplete: 'family-name', klaviyo: 'last_name' },
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'email', required: true, klaviyo: 'email' },
  { name: 'school_email', label: 'School Email (edu email)', type: 'email', required: true, property: 'School Email' },
  { name: 'school_district', label: 'School District', type: 'text', property: 'school or district' },
  { name: 'grade_subject', label: 'Grade or Subject', type: 'text', property: 'grade level or subject' },
];

function educatorForm(listId, location) {
  return {
    site: 'us',
    listId,
    location,
    title: 'Educator signup',
    fields: EDUCATOR_FIELDS,
    submitLabel: 'SIGN-UP FOR FIRST ACCESS',
    consent: EDUCATOR_CONSENT,
    smsConsent: false,
    success: EDUCATOR_SUCCESS,
  };
}

export const KLAVIYO_FORMS = Object.freeze({
  QYqsMS: {
    site: 'us',
    listId: 'TqyU2B',
    location: 'dallas',
    title: 'Dallas free ticket sign-up',
    // Same banner as the Klaviyo form, served from our domain so blockers don't hide it.
    image: {
      src: '/assets/photos/promos/dallas-free-ticket-signup-1200.webp',
      srcset: '/assets/photos/promos/dallas-free-ticket-signup-480.webp 480w, /assets/photos/promos/dallas-free-ticket-signup-800.webp 800w, /assets/photos/promos/dallas-free-ticket-signup-1200.webp 1200w',
      width: 1200,
      height: 628,
      alt: 'Time Mission Dallas free ticket sign-up',
    },
    intro: 'FREE grand opening tickets are coming! Sign up and watch your inbox for your code and first dibs on booking.',
    fields: [
      { name: 'given_name', label: 'First name', type: 'text', autocomplete: 'given-name', klaviyo: 'first_name' },
      { name: 'email', label: 'Email', type: 'email', autocomplete: 'email', required: true, klaviyo: 'email' },
      { name: 'phone', label: 'Phone Number', type: 'tel', autocomplete: 'tel', klaviyo: 'phone_number' },
    ],
    submitLabel: 'Unlock Free Tickets!',
    consent: 'By submitting this form, you consent to receive informational (e.g., order updates) and/or marketing texts (e.g., cart reminders) from Time Mission including texts sent by autodialer. Consent is not a condition of purchase. Msg & data rates may apply. Msg frequency varies. Unsubscribe at any time by replying STOP or clicking the unsubscribe link (where available).',
    smsConsent: true,
    success: {
      title: "You're on the list!",
      text: 'Watch your inbox for your free ticket code and first dibs on booking.',
    },
  },
  // One form for /creators and every /<location>/creators page; visitors pick their location.
  WKi36B: {
    site: 'us',
    listId: 'VQWtvH',
    title: 'Creator Program application',
    intro: 'Join the Time Mission Creator Program. Tell us a little about you and your audience, and our team will review and reach out about collab opportunities.',
    fields: [
      { name: 'given_name', label: 'First name', type: 'text', autocomplete: 'given-name', klaviyo: 'first_name' },
      { name: 'email', label: 'Email', type: 'email', autocomplete: 'email', required: true, klaviyo: 'email' },
      { name: 'social_handle', label: 'Instagram or TikTok handle (@yourname)', type: 'text', required: true, property: 'Social Handle' },
      {
        name: 'creator_platform',
        label: 'Primary platform',
        type: 'select',
        required: true,
        property: 'Creator Platform',
        options: ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Other'].map((value) => ({ label: value, value })),
      },
      {
        name: 'audience_size',
        label: 'Audience size (followers)',
        type: 'select',
        required: true,
        property: 'Audience Size',
        options: ['Under 5K', '5K to 25K', '25K to 100K', '100K+'].map((value) => ({ label: value, value })),
      },
      {
        name: 'creator_location',
        label: 'Closest Time Mission location',
        type: 'select',
        required: true,
        property: 'Creator Location',
        options: [
          { label: 'Philadelphia, PA', value: 'Philadelphia' },
          { label: 'Houston, TX', value: 'Houston' },
          { label: 'Dallas, TX', value: 'Dallas' },
          { label: 'Orland Park, IL', value: 'Orland Park' },
          { label: 'Mount Prospect, IL', value: 'Mount Prospect' },
          { label: 'Manassas, VA', value: 'Manassas' },
          { label: 'Nashville, TN', value: 'Nashville' },
          { label: 'West Nyack, NY', value: 'West Nyack' },
          { label: 'Lincoln, RI', value: 'Lincoln' },
          { label: 'Brussels, Belgium', value: 'Brussels' },
          { label: 'Eindhoven, Netherlands', value: 'Eindhoven' },
          { label: 'Other / Not sure', value: 'Other' },
        ],
      },
    ],
    submitLabel: 'Submit Application',
    // The Klaviyo form shows no consent line; the backup still says what the visitor signs up for.
    consent: 'By submitting this form, you agree to receive emails from Time Mission about the Creator Program. You can unsubscribe at any time using the link in any email.',
    smsConsent: false,
    success: {
      title: 'Application received!',
      text: "Our team reviews every submission and will reach out if it's a fit. In the meantime, follow along for what's coming to Time Mission.",
    },
  },
  TzbcnW: educatorForm('SEQCBY', 'dallas'),
  YsG3eB: educatorForm('XvvXfj', 'houston'),
  TwcrHA: educatorForm('WEQaUk', 'manassas'),
  XmbdNb: educatorForm('ReWgc2', 'mount-prospect'),
  WC5BHF: educatorForm('RPQ58e', 'nashville'),
  SmY6Us: educatorForm('VrpjHs', 'orland-park'),
  YAhjX2: educatorForm('XSawW7', 'philadelphia'),
});

/** Returns the form's backup config, or null if it is unknown or belongs to the other site. */
export function klaviyoFormConfig(formId, site) {
  const id = String(formId || '').trim();
  if (!Object.prototype.hasOwnProperty.call(KLAVIYO_FORMS, id)) return null;
  const config = KLAVIYO_FORMS[id];
  if (site && config.site !== site) return null;
  return config;
}
