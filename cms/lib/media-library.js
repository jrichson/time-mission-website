export const DEFAULT_LANDING_HERO_IMAGE = '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg';
export const PUBLIC_ASSET_PATH_MAX_LENGTH = 512;

const unsafeAssetPathRegex = /[<>"'\\\s]/;

export function publicAssetPathIsValid(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= PUBLIC_ASSET_PATH_MAX_LENGTH &&
    value.startsWith('/assets/') &&
    !value.includes('://') &&
    !value.includes('..') &&
    !unsafeAssetPathRegex.test(value)
  );
}

export function validatePublicAssetPath(value) {
  return publicAssetPathIsValid(value) ? true : 'Use a root-relative /assets/... path with no spaces.';
}

export function validateOptionalPublicAssetPath(value) {
  if (value == null || value === '') return true;
  return validatePublicAssetPath(value);
}

export function publicAssetPathOrFallback(value, fallback = DEFAULT_LANDING_HERO_IMAGE) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return publicAssetPathIsValid(raw) ? raw : fallback;
}

export function publicAssetWasRepaired(value, fallback = DEFAULT_LANDING_HERO_IMAGE) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return Boolean(raw && publicAssetPathOrFallback(raw, fallback) !== raw);
}

export function publicAssetURL(value, origin, fallback = DEFAULT_LANDING_HERO_IMAGE) {
  const path = publicAssetPathOrFallback(value, fallback);
  const base = typeof origin === 'string' ? origin.trim().replace(/\/+$/, '') : '';
  return base ? `${base}${path}` : path;
}
