import { normalizeAvatarLetter } from './accountAvatarSettings';

describe('accountAvatarSettings', () => {
  it('keeps normalized avatar letters to a single display character after uppercasing', () => {
    expect(normalizeAvatarLetter('ß')).toBe('S');
    expect(normalizeAvatarLetter('ßeta')).toBe('S');
    expect(normalizeAvatarLetter('🚀x')).toBe('🚀');
  });
});
