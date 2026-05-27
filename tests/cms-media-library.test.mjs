import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LANDING_HERO_IMAGE,
  publicAssetPathIsValid,
  publicAssetPathOrFallback,
  publicAssetURL,
  publicAssetWasRepaired,
  validateOptionalPublicAssetPath,
  validatePublicAssetPath,
} from '../cms/lib/media-library.js';

describe('CMS media library adapter', () => {
  it('validates approved public asset paths in one place', () => {
    expect(publicAssetPathIsValid('/assets/photos/venue.jpg')).toBe(true);
    expect(publicAssetPathIsValid('https://example.com/photo.jpg')).toBe(false);
    expect(publicAssetPathIsValid('/assets/photos/bad path.jpg')).toBe(false);
    expect(validatePublicAssetPath('/assets/photos/venue.jpg')).toBe(true);
    expect(validateOptionalPublicAssetPath('')).toBe(true);
  });

  it('repairs unsafe paths to the landing fallback and builds public URLs', () => {
    expect(publicAssetPathOrFallback('/bad/path.jpg')).toBe(DEFAULT_LANDING_HERO_IMAGE);
    expect(publicAssetWasRepaired('/bad/path.jpg')).toBe(true);
    expect(publicAssetURL('/assets/photos/venue.jpg', 'https://cms.example/')).toBe('https://cms.example/assets/photos/venue.jpg');
  });
});
