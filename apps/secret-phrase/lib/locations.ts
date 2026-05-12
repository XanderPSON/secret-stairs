export type LocationSlug = 'sf' | 'nyc';

export type Location = {
  slug: LocationSlug;
  displayName: string;
  cityShort: string;
  acrostic: string;
  words: string[];
  riddle: string;
  contractAddress: `0x${string}` | null;
  deployBlock: bigint;
  chainSlug: 'base-sepolia' | 'base';
  passName: string;
};

export const LOCATIONS: Record<LocationSlug, Location> = {
  sf: {
    slug: 'sf',
    displayName: 'San Francisco',
    cityShort: 'SF',
    acrostic: 'SAN FRANCISCO',
    words: [
      'STAKE',
      'ASSET',
      'NETWORK',
      'FEE',
      'REWARD',
      'ACCESS',
      'NODE',
      'CUSTODY',
      'IDENTITY',
      'SECURE',
      'COIN',
      'ONCHAIN',
    ],
    riddle:
      "Coinbase built their HQ here in 2012. A city where 'STAKE your future' " +
      "is more than a phrase—it's a lifestyle. Arrange these 12 blockchain " +
      'concepts in order to reveal the name of this crypto capital. ' +
      'What city am I?',
    // SF reuses the existing Base Sepolia deployment until a dedicated
    // LocationPass contract is deployed for SF. Replace this address (and
    // deployBlock) when the SF-specific contract goes live.
    contractAddress: '0x803CcC4C17568d6213051a607D1ecFE8De1bdF35',
    deployBlock: 40598693n,
    chainSlug: 'base-sepolia',
    passName: 'San Francisco Welcome Pass',
  },
  nyc: {
    slug: 'nyc',
    displayName: 'New York City',
    cityShort: 'NYC',
    acrostic: 'MANHATTAN HUB',
    words: [
      'MARKET',
      'ASSET',
      'NETWORK',
      'HASH',
      'ADDRESS',
      'TRUST',
      'TRADE',
      'ACCESS',
      'NODE',
      'HEDGE',
      'UTILITY',
      'BASE',
    ],
    riddle:
      "I'm the crypto HUB of the East Coast. MARKET ACCESS and TRUST meet " +
      'here in the heart of the island. Arrange these 12 blockchain concepts ' +
      'to spell my name. What am I, where innovation never sleeps?',
    contractAddress: null,
    deployBlock: 0n,
    chainSlug: 'base-sepolia',
    passName: 'Manhattan Hub Pass',
  },
};

export const LOCATION_SLUGS = Object.keys(LOCATIONS) as LocationSlug[];

export function isLocationSlug(value: unknown): value is LocationSlug {
  return typeof value === 'string' && value in LOCATIONS;
}

export function getLocation(slug: string): Location {
  if (!isLocationSlug(slug)) {
    throw new Error(`Unknown location slug: ${slug}`);
  }
  return LOCATIONS[slug];
}

// ─── Letter-swap rule (puzzle contract) ──────────────────────────────────────
// Slot N expects WORDS[N], but the verifier ALSO accepts any other word from
// THIS location's word list whose first letter matches. Example for NYC:
// slot 2 expects ASSET (A); ADDRESS and ACCESS are also A-words in the list,
// so any of {ASSET, ADDRESS, ACCESS} validates that slot. The pool is
// per-location: an A-word from SF won't validate an A-slot in NYC. This
// rule is the user-facing puzzle contract and must be preserved across
// refactors — it is not just an implementation detail.
// ─────────────────────────────────────────────────────────────────────────────

type LetterPools = Map<string, Set<string>>;

// Cached per-Location since pools are pure derivations of `words` and the
// registry is effectively const at runtime.
const POOL_CACHE = new WeakMap<Location, LetterPools>();

function getLetterPools(location: Location): LetterPools {
  const cached = POOL_CACHE.get(location);
  if (cached) {
    return cached;
  }
  const pools: LetterPools = new Map();
  for (const word of location.words) {
    const lower = word.toLowerCase();
    const letter = lower[0];
    let pool = pools.get(letter);
    if (!pool) {
      pool = new Set();
      pools.set(letter, pool);
    }
    pool.add(lower);
  }
  POOL_CACHE.set(location, pools);
  return pools;
}

export function validateSlot(
  location: Location,
  index: number,
  word: string,
): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= location.words.length) {
    return false;
  }
  const cleaned = word.trim().toLowerCase();
  if (cleaned.length === 0) {
    return false;
  }
  const expectedLetter = location.words[index][0].toLowerCase();
  if (cleaned[0] !== expectedLetter) {
    return false;
  }
  const pool = getLetterPools(location).get(expectedLetter);
  return pool ? pool.has(cleaned) : false;
}

export function validatePassphrase(
  location: Location,
  passphrase: string,
): boolean {
  const words = passphrase.trim().split(/\s+/).filter(Boolean);
  if (words.length !== location.words.length) {
    return false;
  }
  return words.every((w, i) => validateSlot(location, i, w));
}
