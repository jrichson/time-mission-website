export const TM_OPS_CONTACT_FORM_LOCATION_SLUGS = Object.freeze([
  'manassas',
  'mount-prospect',
  'orland-park',
]);

export const TM_OPS_GROUP_SUBJECTS = Object.freeze([
  'groups',
  'birthday',
  'corporate',
]);

export const TM_OPS_GROUPS_EMAIL = 'Groups@TM-Ops.com';

export function isTmOpsContactFormLocation(location) {
  return TM_OPS_CONTACT_FORM_LOCATION_SLUGS.includes(String(location || ''));
}

export function tmOpsGroupsRecipient(location, subject) {
  if (!isTmOpsContactFormLocation(location)) return '';
  return TM_OPS_GROUP_SUBJECTS.includes(String(subject || '')) ? TM_OPS_GROUPS_EMAIL : '';
}
