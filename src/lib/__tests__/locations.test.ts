import { describe, expect, it } from 'vitest';
import {
  LOCATIONS,
  LOCATION_SLUGS,
  getLocation,
  isLocationSlug,
  validatePassphrase,
  validateSlot,
} from '../locations';

describe('LOCATIONS registry', () => {
  it('exposes sf and nyc entries', () => {
    expect(LOCATIONS.sf).toBeDefined();
    expect(LOCATIONS.nyc).toBeDefined();
  });

  it('every location has exactly 12 words', () => {
    for (const loc of Object.values(LOCATIONS)) {
      expect(loc.words).toHaveLength(12);
    }
  });

  it("each location's words spell its acrostic (ignoring spaces)", () => {
    for (const loc of Object.values(LOCATIONS)) {
      const fromWords = loc.words.map((w) => w[0].toUpperCase()).join('');
      const fromAcrostic = loc.acrostic.replace(/\s+/g, '').toUpperCase();
      expect(fromWords).toBe(fromAcrostic);
    }
  });

  it('LOCATION_SLUGS matches the registry keys', () => {
    expect(new Set(LOCATION_SLUGS)).toEqual(new Set(Object.keys(LOCATIONS)));
  });
});

describe('isLocationSlug / getLocation', () => {
  it('accepts known slugs', () => {
    expect(isLocationSlug('sf')).toBe(true);
    expect(isLocationSlug('nyc')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isLocationSlug('lon')).toBe(false);
    expect(isLocationSlug('')).toBe(false);
    expect(isLocationSlug(null)).toBe(false);
    expect(isLocationSlug(42)).toBe(false);
  });

  it('getLocation throws on unknown slug', () => {
    expect(() => getLocation('mars')).toThrow(/unknown location/i);
  });
});

describe('validateSlot — exact-word path', () => {
  const nyc = LOCATIONS.nyc;

  it('accepts the exact expected word at every slot (case-insensitive)', () => {
    for (let i = 0; i < nyc.words.length; i++) {
      expect(validateSlot(nyc, i, nyc.words[i])).toBe(true);
      expect(validateSlot(nyc, i, nyc.words[i].toLowerCase())).toBe(true);
      expect(validateSlot(nyc, i, ` ${nyc.words[i]} `)).toBe(true);
    }
  });

  it('rejects empty / whitespace-only input', () => {
    expect(validateSlot(nyc, 0, '')).toBe(false);
    expect(validateSlot(nyc, 0, '   ')).toBe(false);
  });

  it('rejects out-of-range indices', () => {
    expect(validateSlot(nyc, -1, 'MARKET')).toBe(false);
    expect(validateSlot(nyc, 12, 'MARKET')).toBe(false);
    expect(validateSlot(nyc, 1.5, 'ASSET')).toBe(false);
  });
});

describe('validateSlot — letter-swap pool (NYC)', () => {
  const nyc = LOCATIONS.nyc;
  // NYC pools by first letter:
  //   A: ASSET, ADDRESS, ACCESS  (slots 1, 4, 7)
  //   N: NETWORK, NODE           (slots 2, 8)
  //   H: HASH, HEDGE             (slots 3, 9)
  //   T: TRUST, TRADE            (slots 5, 6)

  it('accepts any A-word from NYC at any A-slot', () => {
    for (const slot of [1, 4, 7]) {
      for (const word of ['ASSET', 'ADDRESS', 'ACCESS']) {
        expect(validateSlot(nyc, slot, word)).toBe(true);
      }
    }
  });

  it('accepts any T-word from NYC at any T-slot', () => {
    for (const slot of [5, 6]) {
      for (const word of ['TRUST', 'TRADE']) {
        expect(validateSlot(nyc, slot, word)).toBe(true);
      }
    }
  });

  it('accepts any N-word from NYC at any N-slot', () => {
    for (const slot of [2, 8]) {
      for (const word of ['NETWORK', 'NODE']) {
        expect(validateSlot(nyc, slot, word)).toBe(true);
      }
    }
  });

  it('accepts any H-word from NYC at any H-slot', () => {
    for (const slot of [3, 9]) {
      for (const word of ['HASH', 'HEDGE']) {
        expect(validateSlot(nyc, slot, word)).toBe(true);
      }
    }
  });

  it('rejects an A-word at a non-A slot', () => {
    expect(validateSlot(nyc, 0, 'ASSET')).toBe(false);
    expect(validateSlot(nyc, 11, 'ACCESS')).toBe(false);
  });

  it('rejects a same-letter word that is NOT in the pool (APPLE for A-slot)', () => {
    expect(validateSlot(nyc, 1, 'APPLE')).toBe(false);
    expect(validateSlot(nyc, 1, 'AARDVARK')).toBe(false);
  });
});

describe('validateSlot — cross-location isolation', () => {
  const sf = LOCATIONS.sf;
  const nyc = LOCATIONS.nyc;

  it("rejects an SF A-word at an NYC A-slot if SF has unique A-words NYC doesn't", () => {
    // Both lists have ASSET and ACCESS, so those overlap legitimately.
    // But ADDRESS exists only in NYC, and SF has no A-word that is NOT in NYC,
    // so this test is structurally subtle. Instead, prove the inverse: an SF
    // C-word (CUSTODY/COIN) must NOT validate any NYC slot — NYC has no
    // C-letter slots at all.
    expect(validateSlot(nyc, 0, 'CUSTODY')).toBe(false);
    expect(validateSlot(nyc, 5, 'COIN')).toBe(false);
  });

  it('rejects an NYC-only word (HASH) at any SF slot — SF has no H-slot', () => {
    for (let i = 0; i < sf.words.length; i++) {
      expect(validateSlot(sf, i, 'HASH')).toBe(false);
      expect(validateSlot(sf, i, 'HEDGE')).toBe(false);
    }
  });

  it('an A-word that exists in both pools validates in both', () => {
    expect(validateSlot(sf, 1, 'ASSET')).toBe(true);
    expect(validateSlot(nyc, 1, 'ASSET')).toBe(true);
  });
});

describe('validatePassphrase', () => {
  const nyc = LOCATIONS.nyc;

  it('accepts the exact ordered phrase', () => {
    expect(validatePassphrase(nyc, nyc.words.join(' '))).toBe(true);
  });

  it('accepts a phrase with letter-swapped variants', () => {
    const swapped = [...nyc.words];
    swapped[1] = 'ADDRESS';
    swapped[4] = 'ACCESS';
    swapped[5] = 'TRADE';
    expect(validatePassphrase(nyc, swapped.join(' '))).toBe(true);
  });

  it('is case-insensitive and tolerates extra whitespace', () => {
    const phrase = nyc.words.map((w) => w.toLowerCase()).join('   ');
    expect(validatePassphrase(nyc, `  ${phrase}  `)).toBe(true);
  });

  it('rejects a phrase with the wrong word count', () => {
    expect(validatePassphrase(nyc, 'MARKET ASSET')).toBe(false);
    expect(validatePassphrase(nyc, [...nyc.words, 'EXTRA'].join(' '))).toBe(
      false,
    );
  });

  it('rejects a phrase with one wrong letter', () => {
    const broken = [...nyc.words];
    broken[0] = 'BANANA';
    expect(validatePassphrase(nyc, broken.join(' '))).toBe(false);
  });

  it('rejects an SF phrase against NYC location', () => {
    const sf = LOCATIONS.sf;
    expect(validatePassphrase(nyc, sf.words.join(' '))).toBe(false);
  });
});
