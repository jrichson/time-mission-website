/**
 * Klaviyo embed forms and their first-party backups.
 *
 * Every Klaviyo embed on the site renders a hidden backup form from this registry. The
 * backup appears when Klaviyo's script is blocked and posts to /api/klaviyo-signup, which
 * subscribes the visitor to the same list. The server only trusts list IDs from here.
 * Fields, button text, and consent wording mirror the live Klaviyo form.
 */

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
    listId: 'TqyU2B',
    location: 'dallas',
    title: 'Dallas free ticket sign-up',
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
  TzbcnW: educatorForm('SEQCBY', 'dallas'),
  YsG3eB: educatorForm('XvvXfj', 'houston'),
  TwcrHA: educatorForm('WEQaUk', 'manassas'),
  XmbdNb: educatorForm('ReWgc2', 'mount-prospect'),
  WC5BHF: educatorForm('RPQ58e', 'nashville'),
  SmY6Us: educatorForm('VrpjHs', 'orland-park'),
  YAhjX2: educatorForm('XSawW7', 'philadelphia'),
});

export function klaviyoFormConfig(formId) {
  const id = String(formId || '').trim();
  return Object.prototype.hasOwnProperty.call(KLAVIYO_FORMS, id) ? KLAVIYO_FORMS[id] : null;
}
