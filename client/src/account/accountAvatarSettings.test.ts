import {
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

  it('uses a case-insensitive seed for deterministic fallback colors', () => {
    expect(getAvatarColorFromHash('User@Example.com')).toBe(getAvatarColorFromHash('user@example.com'));
    expect(getAvatarColorFromHash(' user@example.com ')).toBe(getAvatarColorFromHash('user@example.com'));
  });

  it('keeps avatar thumbnail URLs to http and https schemes', () => {
    expect(normalizeThumbnailUrl(' https://example.com/avatar.png ')).toBe('https://example.com/avatar.png');
    expect(normalizeThumbnailUrl('http://example.com/avatar.png')).toBe('http://example.com/avatar.png');
    expect(normalizeThumbnailUrl('javascript:alert(1)')).toBe('');
    expect(normalizeThumbnailUrl('data:image/svg+xml,<svg></svg>')).toBe('');
    expect(normalizeThumbnailUrl('/relative/avatar.png')).toBe('');
  });
});
