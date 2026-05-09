import {
  getAvatarColorFromHash,
  normalizeAvatarLetter,
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
});
