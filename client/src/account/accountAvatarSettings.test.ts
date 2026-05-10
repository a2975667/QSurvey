import {
  getAccountAvatarStorageKey,
  getAvatarColorFromHash,
  normalizeAvatarLetter,
  normalizeThumbnailUrl,
} from './accountAvatarSettings';

describe('accountAvatarSettings', () => {
  it('keeps normalized avatar letters to a single display character after uppercasing', () => {
    expect(normalizeAvatarLetter('ß')).toBe('S');
    expect(normalizeAvatarLetter('ßeta')).toBe('S');
    expect(normalizeAvatarLetter('🚀x')).toBe('🚀');
  });

  it('trims but does not lowercase opaque account ids for storage keys', () => {
    expect(getAccountAvatarStorageKey(' UserId-1 ')).toBe(getAccountAvatarStorageKey('UserId-1'));
    expect(getAccountAvatarStorageKey('UserId-1')).not.toBe(getAccountAvatarStorageKey('userid-1'));
  });

  it('trims the seed for deterministic fallback colors', () => {
    expect(getAvatarColorFromHash(' UserId-1 ')).toBe(getAvatarColorFromHash('UserId-1'));
  });

  it('keeps avatar thumbnail URLs to http and https schemes', () => {
    expect(normalizeThumbnailUrl(' https://example.com/avatar.png ')).toBe('https://example.com/avatar.png');
    expect(normalizeThumbnailUrl('http://example.com/avatar.png')).toBe('http://example.com/avatar.png');
    expect(normalizeThumbnailUrl('javascript:alert(1)')).toBe('');
    expect(normalizeThumbnailUrl('data:image/svg+xml,<svg></svg>')).toBe('');
    expect(normalizeThumbnailUrl('/relative/avatar.png')).toBe('');
  });
});
