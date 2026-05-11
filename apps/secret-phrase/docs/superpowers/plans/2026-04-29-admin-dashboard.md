# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public read-only admin dashboard at `/admin/[chain]` that displays every WelcomeNFT minted on Base Sepolia (and, after deployment, Base mainnet) plus seven analytics widgets.

**Architecture:** Client-side data fetching via viem, cached with React Query (already a dep). One workhorse hook (`useMintEvents`) fetches `Transfer(0x0 → to)` logs in batched parallel calls; pure derivation functions feed the widgets. Chain-aware via a single registry so adding Base mainnet is one config edit. No new infra — no DB, no API routes, no indexer.

**Tech Stack:** Next.js 14 App Router, viem v2, wagmi v2, @tanstack/react-query v5, Tailwind, Recharts (new dep), vitest, biome.

**Spec:** `docs/superpowers/specs/2026-04-29-admin-dashboard-design.md`

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/admin/chains.ts` | Chain registry: id, slug, contract, deployBlock, RPC, explorer URLs |
| `src/lib/admin/publicClient.ts` | Memoized viem `PublicClient` per chain slug |
| `src/lib/admin/types.ts` | `MintEvent`, `TokenMetadata` types |
| `src/lib/admin/format.ts` | `truncateAddress`, `timeAgo`, `formatPT` |
| `src/lib/admin/derive.ts` | `totals`, `groupByDay`, `groupByHourPT`, `holders`, `recentFeed` |
| `src/lib/admin/useMintEvents.ts` | React Query hook: fetch all mint events for a chain |
| `src/lib/admin/useTokenMetadata.ts` | React Query hook: decode `tokenURI(id)` |
| `src/lib/admin/useWalletTypes.ts` | React Query hook: `getCode` for unique addresses |
| `src/lib/admin/__tests__/derive.test.ts` | Unit tests for derivations |
| `src/lib/admin/__tests__/format.test.ts` | Unit tests for formatters |
| `src/lib/admin/__tests__/chains.test.ts` | Unit tests for `getChain` |
| `src/components/admin/WidgetCard.tsx` | Shared card chrome |
| `src/components/admin/WidgetSkeleton.tsx` | Shared loading skeleton |
| `src/components/admin/WidgetError.tsx` | Shared error state w/ retry |
| `src/components/admin/WidgetEmpty.tsx` | Shared empty state |
| `src/components/admin/AdminHeader.tsx` | Logo, chain switcher, contract link, refresh |
| `src/components/admin/ChainSwitcher.tsx` | `<select>` for chain navigation |
| `src/components/admin/StatCards.tsx` | Total / Today / Week / Unique tiles |
| `src/components/admin/MintsOverTimeChart.tsx` | Recharts ComposedChart |
| `src/components/admin/HourOfDayHeatmap.tsx` | Hand-rolled SVG 7×24 grid |
| `src/components/admin/WalletTypeBreakdown.tsx` | Smart vs EOA stacked bar |
| `src/components/admin/RecentMintsFeed.tsx` | Last N mints |
| `src/components/admin/HoldersTable.tsx` | Paginated minters table + CSV download |
| `src/components/admin/PassGallery.tsx` | Grid of all SVGs |
| `src/components/admin/PassDetailModal.tsx` | Full-size SVG + metadata + explorer links |
| `src/app/admin/layout.tsx` | Dark gradient bg + header |
| `src/app/admin/page.tsx` | Redirect to `/admin/base-sepolia` |
| `src/app/admin/[chain]/page.tsx` | The dashboard, composes all widgets |

### Modified files

| Path | Change |
|---|---|
| `package.json` | Add `recharts` dependency |
| `.env.local.example` | Document optional `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`, `NEXT_PUBLIC_BASE_RPC_URL` |
| `src/app/layout.tsx` | Conditionally remove the body's `flex items-center justify-center min-h-screen` for admin routes (see Task 0) |
| `src/components/Providers.tsx` | (no change — already wraps in WagmiProvider + QueryClientProvider) |

---

## Task 0: Pre-flight & Layout Adjustment

The root `<body>` is `flex items-center justify-center min-h-screen` which centers the mint page nicely but breaks dashboard layouts (which need full-width). Fix this first so subsequent visual work isn't fighting the centering.

**Files:**
- Modify: `src/app/layout.tsx:31`

- [ ] **Step 1: Read the current layout to confirm the line**

Run: `grep -n 'min-h-screen' src/app/layout.tsx`
Expected: `31:      <body className="flex items-center justify-center min-h-screen">`

- [ ] **Step 2: Replace centering with min-height-only**

Replace line 31 in `src/app/layout.tsx`:

```tsx
      <body className="min-h-screen">
```

The mint `page.tsx` already centers itself (verify by skimming `src/app/page.tsx` — it uses its own flex centering). Removing it from the body makes the body act as a normal block container, so `/admin` can fill the viewport without a fight.

- [ ] **Step 3: Verify mint page still looks centered**

Run: `npm run dev` and open `http://localhost:3000/`. Confirm the mint page still appears centered.

If the mint page is NOT centered after this change, instead of editing the body, conditionally apply the centering only on non-admin pages. The cleanest way: wrap the mint page's content in `<div className="flex items-center justify-center min-h-screen">` inside `src/app/page.tsx` and revert the body. (Do this only if needed.)

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx 2>/dev/null || git add src/app/layout.tsx
git commit -m "chore(layout): unbind body from full-screen flex centering

Body now uses min-h-screen only so /admin can use a full-width layout.
Mint page centering is unaffected."
```

---

## Task 1: Add Recharts Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install recharts**

Run: `npm install recharts@^2.12.0`
Expected: package added to `dependencies`, no peer-dep warnings.

- [ ] **Step 2: Verify install**

Run: `node -e "console.log(require('recharts/package.json').version)"`
Expected: prints a version `2.12.x` or higher.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add recharts for admin dashboard charts"
```

---

## Task 2: Chain Registry & Public Client

**Files:**
- Create: `src/lib/admin/chains.ts`
- Create: `src/lib/admin/publicClient.ts`
- Create: `src/lib/admin/__tests__/chains.test.ts`

- [ ] **Step 1: Look up the contract creation block on Base Sepolia**

Open `https://sepolia.basescan.org/address/0x803CcC4C17568d6213051a607D1ecFE8De1bdF35` in a browser. Find the "Contract Creator" row → click the creation tx hash → note the **Block** number. That number is the `deployBlock`.

If you cannot access BaseScan, use `0n` instead and note in a comment that a tighter value will improve initial load time.

Write down the value. Example for the rest of this task we'll call it `<DEPLOY_BLOCK>` — replace it with the actual number (e.g. `25_000_000n`).

- [ ] **Step 2: Write the failing test for `getChain`**

Create `src/lib/admin/__tests__/chains.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ADMIN_CHAINS,
  DEFAULT_CHAIN_SLUG,
  getChain,
} from '../chains';

describe('chains registry', () => {
  it('exposes base-sepolia and base entries', () => {
    expect(ADMIN_CHAINS['base-sepolia']).toBeDefined();
    expect(ADMIN_CHAINS['base']).toBeDefined();
  });

  it('base-sepolia has a contract address', () => {
    expect(ADMIN_CHAINS['base-sepolia'].contractAddress).toMatch(
      /^0x[0-9a-fA-F]{40}$/,
    );
  });

  it('base mainnet contractAddress is null until deployed', () => {
    expect(ADMIN_CHAINS['base'].contractAddress).toBeNull();
  });

  it('default chain slug resolves', () => {
    expect(() => getChain(DEFAULT_CHAIN_SLUG)).not.toThrow();
  });

  it('throws on unknown slug', () => {
    expect(() => getChain('mars')).toThrow(/unknown chain/i);
  });

  it('explorer URLs are well-formed', () => {
    const c = getChain('base-sepolia');
    expect(c.explorerTxUrl('0xabc')).toContain('sepolia.basescan.org/tx/0xabc');
    expect(c.explorerAddressUrl('0xdef')).toContain(
      'sepolia.basescan.org/address/0xdef',
    );
  });
});
```

- [ ] **Step 3: Run the test (expect failure)**

Run: `npm test -- chains.test`
Expected: FAIL with "Cannot find module '../chains'".

- [ ] **Step 4: Implement `chains.ts`**

Create `src/lib/admin/chains.ts` (replace `<DEPLOY_BLOCK>` with the value from Step 1):

```ts
import { base, baseSepolia } from 'wagmi/chains';

export type AdminChain = {
  id: number;
  slug: 'base-sepolia' | 'base';
  name: string;
  viemChain: typeof base | typeof baseSepolia;
  contractAddress: `0x${string}` | null;
  deployBlock: bigint;
  rpcUrl: string | undefined;
  blockTimeSec: number;
  explorerName: string;
  explorerTxUrl: (hash: string) => string;
  explorerAddressUrl: (addr: string) => string;
  explorerTokenUrl: (addr: string, tokenId: bigint) => string;
  thirdwebTokenUrl: (addr: string, tokenId: bigint) => string;
  blockscoutTokenUrl: (addr: string) => string;
};

export const ADMIN_CHAINS: Record<string, AdminChain> = {
  'base-sepolia': {
    id: 84532,
    slug: 'base-sepolia',
    name: 'Base Sepolia',
    viemChain: baseSepolia,
    contractAddress: '0x803CcC4C17568d6213051a607D1ecFE8De1bdF35',
    deployBlock: <DEPLOY_BLOCK>,
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
    blockTimeSec: 2,
    explorerName: 'BaseScan',
    explorerTxUrl: (h) => `https://sepolia.basescan.org/tx/${h}`,
    explorerAddressUrl: (a) => `https://sepolia.basescan.org/address/${a}`,
    explorerTokenUrl: (a, id) =>
      `https://sepolia.basescan.org/token/${a}?a=${id.toString()}`,
    thirdwebTokenUrl: (a, id) =>
      `https://thirdweb.com/base-sepolia-testnet/${a}/nfts/${id.toString()}`,
    blockscoutTokenUrl: (a) =>
      `https://base-sepolia.blockscout.com/token/${a}`,
  },
  base: {
    id: 8453,
    slug: 'base',
    name: 'Base',
    viemChain: base,
    contractAddress: null,
    deployBlock: 0n,
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL,
    blockTimeSec: 2,
    explorerName: 'BaseScan',
    explorerTxUrl: (h) => `https://basescan.org/tx/${h}`,
    explorerAddressUrl: (a) => `https://basescan.org/address/${a}`,
    explorerTokenUrl: (a, id) =>
      `https://basescan.org/token/${a}?a=${id.toString()}`,
    thirdwebTokenUrl: (a, id) =>
      `https://thirdweb.com/base/${a}/nfts/${id.toString()}`,
    blockscoutTokenUrl: (a) => `https://base.blockscout.com/token/${a}`,
  },
};

export const DEFAULT_CHAIN_SLUG = 'base-sepolia' as const;

export function getChain(slug: string): AdminChain {
  const chain = ADMIN_CHAINS[slug];
  if (!chain) {
    throw new Error(`Unknown chain slug: ${slug}`);
  }
  return chain;
}
```

- [ ] **Step 5: Run the test (expect pass)**

Run: `npm test -- chains.test`
Expected: PASS, all 6 tests green.

- [ ] **Step 6: Implement `publicClient.ts`**

Create `src/lib/admin/publicClient.ts`:

```ts
import { http, type PublicClient, createPublicClient } from 'viem';
import type { AdminChain } from './chains';

const clients = new Map<string, PublicClient>();

export function getPublicClient(chain: AdminChain): PublicClient {
  const cached = clients.get(chain.slug);
  if (cached) {
    return cached;
  }
  const client = createPublicClient({
    chain: chain.viemChain,
    transport: http(chain.rpcUrl),
  }) as PublicClient;
  clients.set(chain.slug, client);
  return client;
}
```

- [ ] **Step 7: Lint check**

Run: `npm run lint`
Expected: no new warnings/errors in the new files.

- [ ] **Step 8: Commit**

```bash
git add src/lib/admin/chains.ts src/lib/admin/publicClient.ts src/lib/admin/__tests__/chains.test.ts
git commit -m "feat(admin): chain registry and viem public client"
```

---

## Task 3: Shared Types and Formatters

**Files:**
- Create: `src/lib/admin/types.ts`
- Create: `src/lib/admin/format.ts`
- Create: `src/lib/admin/__tests__/format.test.ts`

- [ ] **Step 1: Write the failing test for `format.ts`**

Create `src/lib/admin/__tests__/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatPT, timeAgo, truncateAddress } from '../format';

describe('truncateAddress', () => {
  it('truncates a 42-char address to first6...last4', () => {
    expect(
      truncateAddress('0x1234567890123456789012345678901234567890'),
    ).toBe('0x1234…7890');
  });

  it('returns short input unchanged', () => {
    expect(truncateAddress('0xabc')).toBe('0xabc');
  });
});

describe('timeAgo', () => {
  const now = Date.UTC(2026, 0, 15, 12, 0, 0) / 1000;

  it('returns "just now" for <30s', () => {
    expect(timeAgo(now - 5, now)).toBe('just now');
  });

  it('returns "Nm ago" for minutes', () => {
    expect(timeAgo(now - 60 * 5, now)).toBe('5m ago');
  });

  it('returns "Nh ago" for hours', () => {
    expect(timeAgo(now - 60 * 60 * 3, now)).toBe('3h ago');
  });

  it('returns "Nd ago" for days', () => {
    expect(timeAgo(now - 60 * 60 * 24 * 2, now)).toBe('2d ago');
  });
});

describe('formatPT', () => {
  it('formats a unix timestamp in America/Los_Angeles', () => {
    // 2026-01-15T20:30:00Z = 12:30 PM PST on Jan 15
    const result = formatPT(Date.UTC(2026, 0, 15, 20, 30, 0) / 1000);
    expect(result).toMatch(/Jan 15.*12:30/);
  });
});
```

- [ ] **Step 2: Run test (expect failure)**

Run: `npm test -- format.test`
Expected: FAIL with "Cannot find module '../format'".

- [ ] **Step 3: Implement `format.ts`**

Create `src/lib/admin/format.ts`:

```ts
export function truncateAddress(addr: string): string {
  if (addr.length < 12) {
    return addr;
  }
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function timeAgo(unixSec: number, nowSec: number = Date.now() / 1000): string {
  const diff = Math.max(0, Math.floor(nowSec - unixSec));
  if (diff < 30) {
    return 'just now';
  }
  if (diff < 60 * 60) {
    return `${Math.floor(diff / 60)}m ago`;
  }
  if (diff < 60 * 60 * 24) {
    return `${Math.floor(diff / (60 * 60))}h ago`;
  }
  return `${Math.floor(diff / (60 * 60 * 24))}d ago`;
}

const PT_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: false,
});

export function formatPT(unixSec: number): string {
  return PT_FORMATTER.format(new Date(unixSec * 1000));
}
```

- [ ] **Step 4: Create `types.ts`**

Create `src/lib/admin/types.ts`:

```ts
export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export type MintEvent = {
  tokenId: bigint;
  to: Address;
  blockNumber: bigint;
  txHash: Hex;
  timestamp: number; // unix seconds
};

export type TokenMetadata = {
  name: string;
  description: string;
  imageDataUri: string;
  attributes: { trait_type: string; value: string | number }[];
};

export type WalletKind = 'smart' | 'eoa';
```

- [ ] **Step 5: Run tests**

Run: `npm test -- format.test`
Expected: PASS, all tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/format.ts src/lib/admin/types.ts src/lib/admin/__tests__/format.test.ts
git commit -m "feat(admin): shared types and formatters"
```

---

## Task 4: Pure Derivations

**Files:**
- Create: `src/lib/admin/derive.ts`
- Create: `src/lib/admin/__tests__/derive.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/admin/__tests__/derive.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  groupByDay,
  groupByHourPT,
  holders,
  recentFeed,
  totals,
} from '../derive';
import type { MintEvent } from '../types';

const A = '0x0000000000000000000000000000000000000001' as const;
const B = '0x0000000000000000000000000000000000000002' as const;
const C = '0x0000000000000000000000000000000000000003' as const;

// PT timezone: 2026-04-29 10:00 PT = 2026-04-29 17:00 UTC
const event = (tokenId: bigint, to: typeof A, isoUtc: string): MintEvent => ({
  tokenId,
  to,
  blockNumber: tokenId,
  txHash: `0x${tokenId.toString(16).padStart(64, '0')}` as `0x${string}`,
  timestamp: Math.floor(new Date(isoUtc).getTime() / 1000),
});

describe('totals', () => {
  it('counts total, today, week, unique', () => {
    const now = new Date('2026-04-29T20:00:00Z'); // 1pm PT
    const events: MintEvent[] = [
      event(0n, A, '2026-04-29T19:00:00Z'), // today PT (12pm)
      event(1n, B, '2026-04-28T19:00:00Z'), // yesterday PT
      event(2n, A, '2026-04-15T19:00:00Z'), // >7d ago
    ];
    const t = totals(events, now.getTime() / 1000);
    expect(t.total).toBe(3);
    expect(t.today).toBe(1);
    expect(t.thisWeek).toBe(2); // today + yesterday within rolling 7d
    expect(t.uniqueMinters).toBe(2);
  });

  it('returns zeros for empty', () => {
    expect(totals([], Date.now() / 1000)).toEqual({
      total: 0,
      today: 0,
      thisWeek: 0,
      uniqueMinters: 0,
    });
  });
});

describe('groupByDay', () => {
  it('groups by PT day with cumulative', () => {
    const events: MintEvent[] = [
      event(0n, A, '2026-04-27T19:00:00Z'), // 12pm PT 4/27
      event(1n, B, '2026-04-28T19:00:00Z'),
      event(2n, C, '2026-04-28T20:00:00Z'),
    ];
    const result = groupByDay(events);
    expect(result).toEqual([
      { date: '2026-04-27', count: 1, cumulative: 1 },
      { date: '2026-04-28', count: 2, cumulative: 3 },
    ]);
  });
});

describe('groupByHourPT', () => {
  it('groups by day-of-week and hour in PT', () => {
    // 2026-04-29 is a Wednesday. 19:00 UTC = 12:00 PT
    const events: MintEvent[] = [
      event(0n, A, '2026-04-29T19:00:00Z'),
    ];
    const grid = groupByHourPT(events);
    // Wed = 3 (Sun=0)
    const cell = grid.find((c) => c.dow === 3 && c.hour === 12);
    expect(cell?.count).toBe(1);
    expect(grid.length).toBe(7 * 24);
  });
});

describe('holders', () => {
  it('returns minters sorted by tokenId desc', () => {
    const events: MintEvent[] = [
      event(0n, A, '2026-04-27T19:00:00Z'),
      event(1n, B, '2026-04-28T19:00:00Z'),
    ];
    const h = holders(events);
    expect(h[0].tokenId).toBe(1n);
    expect(h[0].address).toBe(B);
    expect(h[1].tokenId).toBe(0n);
  });
});

describe('recentFeed', () => {
  it('returns most recent first, capped at limit', () => {
    const events: MintEvent[] = [
      event(0n, A, '2026-04-27T19:00:00Z'),
      event(1n, B, '2026-04-28T19:00:00Z'),
      event(2n, C, '2026-04-29T19:00:00Z'),
    ];
    const feed = recentFeed(events, 2);
    expect(feed.map((e) => e.tokenId)).toEqual([2n, 1n]);
  });
});
```

- [ ] **Step 2: Run test (expect failure)**

Run: `npm test -- derive.test`
Expected: FAIL with "Cannot find module '../derive'".

- [ ] **Step 3: Implement `derive.ts`**

Create `src/lib/admin/derive.ts`:

```ts
import type { Address, MintEvent } from './types';

const PT_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const PT_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  weekday: 'short',
  hour: 'numeric',
  hour12: false,
});

const DAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function ptDateString(unixSec: number): string {
  return PT_DATE.format(new Date(unixSec * 1000)); // YYYY-MM-DD
}

function ptDowAndHour(unixSec: number): { dow: number; hour: number } {
  const parts = PT_PARTS.formatToParts(new Date(unixSec * 1000));
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
  // Intl returns "24" for midnight in some locales; normalize.
  const hour = Number(hourStr) % 24;
  return { dow: DAY_INDEX[weekday] ?? 0, hour };
}

export function totals(
  events: readonly MintEvent[],
  nowSec: number = Date.now() / 1000,
): {
  total: number;
  today: number;
  thisWeek: number;
  uniqueMinters: number;
} {
  const today = ptDateString(nowSec);
  const oneWeekAgo = nowSec - 60 * 60 * 24 * 7;
  let todayCount = 0;
  let weekCount = 0;
  const unique = new Set<Address>();
  for (const e of events) {
    unique.add(e.to);
    if (ptDateString(e.timestamp) === today) {
      todayCount += 1;
    }
    if (e.timestamp >= oneWeekAgo) {
      weekCount += 1;
    }
  }
  return {
    total: events.length,
    today: todayCount,
    thisWeek: weekCount,
    uniqueMinters: unique.size,
  };
}

export function groupByDay(
  events: readonly MintEvent[],
): { date: string; count: number; cumulative: number }[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    const d = ptDateString(e.timestamp);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  let cum = 0;
  return sorted.map(([date, count]) => {
    cum += count;
    return { date, count, cumulative: cum };
  });
}

export function groupByHourPT(
  events: readonly MintEvent[],
): { dow: number; hour: number; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    const { dow, hour } = ptDowAndHour(e.timestamp);
    const key = `${dow}-${hour}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const grid: { dow: number; hour: number; count: number }[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      grid.push({ dow, hour, count: counts.get(`${dow}-${hour}`) ?? 0 });
    }
  }
  return grid;
}

export function holders(
  events: readonly MintEvent[],
): { address: Address; tokenId: bigint; mintedAt: number }[] {
  return [...events]
    .map((e) => ({ address: e.to, tokenId: e.tokenId, mintedAt: e.timestamp }))
    .sort((a, b) => (a.tokenId > b.tokenId ? -1 : 1));
}

export function recentFeed(
  events: readonly MintEvent[],
  limit = 20,
): MintEvent[] {
  return [...events]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- derive.test`
Expected: PASS, all 7 tests green.

If `groupByHourPT` test fails because `Intl.DateTimeFormat` returns "24" for midnight on the user's node version, the `% 24` normalization in `ptDowAndHour` should handle it. If not, switch to `hourCycle: 'h23'` in the formatter options.

- [ ] **Step 5: Lint check**

Run: `npm run lint`
Expected: no new warnings/errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/derive.ts src/lib/admin/__tests__/derive.test.ts
git commit -m "feat(admin): pure derivations (totals, groupByDay/Hour, holders, feed)"
```

---

## Task 5: `useMintEvents` Hook

**Files:**
- Create: `src/lib/admin/useMintEvents.ts`

This hook is not unit-tested (it's a thin React Query wrapper around viem); we verify it manually by hooking into the dashboard. The pure functions it relies on are tested.

- [ ] **Step 1: Implement `useMintEvents.ts`**

Create `src/lib/admin/useMintEvents.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { type Log, parseAbiItem } from 'viem';
import type { AdminChain } from './chains';
import { getPublicClient } from './publicClient';
import type { MintEvent } from './types';

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
);

const BATCH_SIZE = 10_000n;
const BATCH_CONCURRENCY = 4;
const TIMESTAMP_CONCURRENCY = 8;

async function withConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const idx = cursor;
        cursor += 1;
        if (idx >= items.length) {
          return;
        }
        results[idx] = await fn(items[idx]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

async function fetchMintEvents(chain: AdminChain): Promise<MintEvent[]> {
  if (!chain.contractAddress) {
    return [];
  }
  const client = getPublicClient(chain);
  const latest = await client.getBlockNumber();

  // Build batched ranges from deployBlock to latest.
  const ranges: { from: bigint; to: bigint }[] = [];
  for (let from = chain.deployBlock; from <= latest; from += BATCH_SIZE) {
    const to = from + BATCH_SIZE - 1n > latest ? latest : from + BATCH_SIZE - 1n;
    ranges.push({ from, to });
  }

  const logBatches = await withConcurrency(ranges, BATCH_CONCURRENCY, (range) =>
    client.getLogs({
      address: chain.contractAddress as `0x${string}`,
      event: TRANSFER_EVENT,
      args: { from: '0x0000000000000000000000000000000000000000' },
      fromBlock: range.from,
      toBlock: range.to,
    }),
  );

  const logs: Log[] = logBatches.flat();

  // Resolve unique block timestamps.
  const uniqueBlocks = [...new Set(logs.map((l) => l.blockNumber!))];
  const blocks = await withConcurrency(
    uniqueBlocks,
    TIMESTAMP_CONCURRENCY,
    (bn) => client.getBlock({ blockNumber: bn }),
  );
  const tsByBlock = new Map<bigint, number>();
  for (const b of blocks) {
    tsByBlock.set(b.number!, Number(b.timestamp));
  }

  const events: MintEvent[] = logs.map((log) => {
    // Decoded args present because we passed `event: TRANSFER_EVENT`.
    const args = (log as unknown as { args: { to: `0x${string}`; tokenId: bigint } }).args;
    return {
      tokenId: args.tokenId,
      to: args.to,
      blockNumber: log.blockNumber!,
      txHash: log.transactionHash!,
      timestamp: tsByBlock.get(log.blockNumber!) ?? 0,
    };
  });

  return events.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber < b.blockNumber ? -1 : 1;
    }
    return a.tokenId < b.tokenId ? -1 : 1;
  });
}

export function useMintEvents(chain: AdminChain) {
  return useQuery({
    queryKey: ['admin', 'mintEvents', chain.slug],
    queryFn: () => fetchMintEvents(chain),
    enabled: chain.contractAddress !== null,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If strict-mode complaints surface around `log.blockNumber!`, they're acceptable because viem's `Log` type marks block fields as nullable for pending logs; we only fetch confirmed logs here.)

- [ ] **Step 3: Lint check**

Run: `npm run lint`
Expected: no new warnings/errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/useMintEvents.ts
git commit -m "feat(admin): useMintEvents hook with batched parallel getLogs"
```

---

## Task 6: `useTokenMetadata` Hook

**Files:**
- Create: `src/lib/admin/useTokenMetadata.ts`

- [ ] **Step 1: Implement**

Create `src/lib/admin/useTokenMetadata.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { welcomeNftAbi } from '../../constants';
import type { AdminChain } from './chains';
import { getPublicClient } from './publicClient';
import type { TokenMetadata } from './types';

const JSON_PREFIX = 'data:application/json;base64,';

function decodeBase64(b64: string): string {
  if (typeof atob === 'function') {
    return atob(b64);
  }
  // Node fallback (shouldn't be hit in browser); avoid `Buffer` to satisfy biome's noNodejsModules.
  throw new Error('atob unavailable in this runtime');
}

async function fetchMetadata(
  chain: AdminChain,
  tokenId: bigint,
): Promise<TokenMetadata> {
  if (!chain.contractAddress) {
    throw new Error('Contract not deployed on this chain');
  }
  const client = getPublicClient(chain);
  const uri = (await client.readContract({
    address: chain.contractAddress,
    abi: welcomeNftAbi,
    functionName: 'tokenURI',
    args: [tokenId],
  })) as string;

  if (!uri.startsWith(JSON_PREFIX)) {
    throw new Error(`Unexpected tokenURI scheme: ${uri.slice(0, 32)}…`);
  }
  const json = JSON.parse(decodeBase64(uri.slice(JSON_PREFIX.length))) as {
    name: string;
    description: string;
    image: string;
    attributes: { trait_type: string; value: string | number }[];
  };
  return {
    name: json.name,
    description: json.description,
    imageDataUri: json.image,
    attributes: json.attributes ?? [],
  };
}

export function useTokenMetadata(chain: AdminChain, tokenId: bigint) {
  return useQuery({
    queryKey: ['admin', 'tokenMetadata', chain.slug, tokenId.toString()],
    queryFn: () => fetchMetadata(chain, tokenId),
    enabled: chain.contractAddress !== null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/useTokenMetadata.ts
git commit -m "feat(admin): useTokenMetadata hook with base64 tokenURI decoding"
```

---

## Task 7: `useWalletTypes` Hook

**Files:**
- Create: `src/lib/admin/useWalletTypes.ts`

- [ ] **Step 1: Implement**

Create `src/lib/admin/useWalletTypes.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import type { AdminChain } from './chains';
import { getPublicClient } from './publicClient';
import type { Address, WalletKind } from './types';

const CONCURRENCY = 8;

async function withConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const idx = cursor;
        cursor += 1;
        if (idx >= items.length) {
          return;
        }
        results[idx] = await fn(items[idx]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

async function fetchWalletTypes(
  chain: AdminChain,
  addresses: readonly Address[],
): Promise<Record<Address, WalletKind>> {
  const client = getPublicClient(chain);
  const codes = await withConcurrency(addresses, CONCURRENCY, (addr) =>
    client.getCode({ address: addr }),
  );
  const result: Record<Address, WalletKind> = {};
  addresses.forEach((addr, i) => {
    const code = codes[i];
    result[addr] = code && code !== '0x' ? 'smart' : 'eoa';
  });
  return result;
}

export function useWalletTypes(
  chain: AdminChain,
  addresses: readonly Address[],
) {
  // Stable key: sorted unique addresses.
  const sorted = [...new Set(addresses)].sort();
  return useQuery({
    queryKey: ['admin', 'walletTypes', chain.slug, sorted.join(',')],
    queryFn: () => fetchWalletTypes(chain, sorted),
    enabled: sorted.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/useWalletTypes.ts
git commit -m "feat(admin): useWalletTypes hook for smart-wallet vs EOA detection"
```

---

## Task 8: Shared Widget Chrome

**Files:**
- Create: `src/components/admin/WidgetCard.tsx`
- Create: `src/components/admin/WidgetSkeleton.tsx`
- Create: `src/components/admin/WidgetError.tsx`
- Create: `src/components/admin/WidgetEmpty.tsx`

- [ ] **Step 1: Implement `WidgetCard.tsx`**

```tsx
import type { ReactNode } from 'react';

export function WidgetCard({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm ${className}`}
    >
      {title || action ? (
        <header className="mb-4 flex items-center justify-between">
          {title ? (
            <h2 className="font-mono text-white/50 text-xs uppercase tracking-widest">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Implement `WidgetSkeleton.tsx`**

```tsx
export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder rows are static
          key={i}
          className="h-4 rounded bg-white/10"
          style={{ width: `${60 + ((i * 17) % 30)}%` }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement `WidgetError.tsx`**

```tsx
export function WidgetError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4">
      <p className="text-red-200 text-sm">Error: {message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded border border-red-500/50 px-3 py-1 text-red-100 text-xs hover:bg-red-500/20"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Implement `WidgetEmpty.tsx`**

```tsx
import type { ReactNode } from 'react';

export function WidgetEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="py-8 text-center text-sm text-white/50">{children}</div>
  );
}
```

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: clean (or auto-fixed).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/WidgetCard.tsx src/components/admin/WidgetSkeleton.tsx src/components/admin/WidgetError.tsx src/components/admin/WidgetEmpty.tsx
git commit -m "feat(admin): shared widget card chrome and state components"
```

---

## Task 9: Header & Chain Switcher

**Files:**
- Create: `src/components/admin/ChainSwitcher.tsx`
- Create: `src/components/admin/AdminHeader.tsx`

- [ ] **Step 1: Implement `ChainSwitcher.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { ADMIN_CHAINS } from '../../lib/admin/chains';

export function ChainSwitcher({ currentSlug }: { currentSlug: string }) {
  const router = useRouter();
  return (
    <select
      value={currentSlug}
      onChange={(e) => router.push(`/admin/${e.target.value}`)}
      className="rounded border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]"
    >
      {Object.values(ADMIN_CHAINS).map((c) => (
        <option key={c.slug} value={c.slug} className="bg-[#0A1628]">
          {c.name}
          {c.contractAddress === null ? ' (coming soon)' : ''}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Implement `AdminHeader.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import { truncateAddress } from '../../lib/admin/format';
import { ChainSwitcher } from './ChainSwitcher';

export function AdminHeader({
  chain,
  isFetching,
  dataUpdatedAt,
  onRefresh,
}: {
  chain: AdminChain;
  isFetching: boolean;
  dataUpdatedAt: number; // ms since epoch; 0 if never
  onRefresh: () => void;
}) {
  const [tick, setTick] = useState(0);
  // Re-render every second so "Xs ago" stays accurate.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ago =
    dataUpdatedAt > 0
      ? Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000))
      : null;

  return (
    <header className="flex flex-col gap-3 border-white/10 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-mono text-[#3380FF] text-xs uppercase tracking-widest">
          Secret Stairs
        </p>
        <h1 className="font-bold text-white text-xl">Admin Dashboard</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ChainSwitcher currentSlug={chain.slug} />

        {chain.contractAddress ? (
          <a
            href={chain.explorerAddressUrl(chain.contractAddress)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-white/70 hover:text-white"
            title={chain.contractAddress}
          >
            {truncateAddress(chain.contractAddress)} ↗
          </a>
        ) : (
          <span className="font-mono text-sm text-white/40">no contract</span>
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 rounded border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-50"
        >
          <span className={isFetching ? 'animate-spin' : ''}>↻</span>
          {ago === null ? 'never' : `${ago}s ago`}
          {/* tick is read just to make the dependency explicit */}
          <span className="hidden">{tick}</span>
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ChainSwitcher.tsx src/components/admin/AdminHeader.tsx
git commit -m "feat(admin): header and chain switcher"
```

---

## Task 10: Stat Cards

**Files:**
- Create: `src/components/admin/StatCards.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useMemo } from 'react';
import { totals } from '../../lib/admin/derive';
import type { MintEvent } from '../../lib/admin/types';

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <p className="font-mono text-white/50 text-xs uppercase tracking-widest">
        {label}
      </p>
      <p className="mt-2 font-bold font-mono text-3xl text-white tabular-nums">
        {value}
      </p>
      {sub ? <p className="mt-1 text-white/40 text-xs">{sub}</p> : null}
    </div>
  );
}

export function StatCards({ events }: { events: MintEvent[] }) {
  const t = useMemo(() => totals(events), [events]);
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile label="Total" value={t.total} sub="passes minted" />
      <StatTile label="Today" value={t.today} sub="PT" />
      <StatTile label="This Week" value={t.thisWeek} sub="last 7 days" />
      <StatTile label="Unique Minters" value={t.uniqueMinters} />
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/admin/StatCards.tsx
git commit -m "feat(admin): stat cards widget"
```

---

## Task 11: Mints Over Time Chart

**Files:**
- Create: `src/components/admin/MintsOverTimeChart.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { groupByDay } from '../../lib/admin/derive';
import type { MintEvent } from '../../lib/admin/types';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

export function MintsOverTimeChart({ events }: { events: MintEvent[] }) {
  const data = useMemo(() => groupByDay(events), [events]);

  return (
    <WidgetCard title="Mints Over Time">
      {data.length === 0 ? (
        <WidgetEmpty>No mints yet.</WidgetEmpty>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#ffffff80', fontSize: 11 }}
                stroke="#ffffff20"
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#ffffff80', fontSize: 11 }}
                stroke="#ffffff20"
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#ffffff60', fontSize: 11 }}
                stroke="#ffffff20"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#0A1628',
                  border: '1px solid #ffffff20',
                  borderRadius: 8,
                  color: '#fff',
                }}
                cursor={{ fill: '#0052FF20' }}
              />
              <Bar
                yAxisId="left"
                dataKey="count"
                fill="#0052FF"
                name="Daily mints"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                stroke="#3380FF"
                strokeWidth={2}
                dot={false}
                name="Cumulative"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/admin/MintsOverTimeChart.tsx
git commit -m "feat(admin): mints-over-time chart (daily bars + cumulative line)"
```

---

## Task 12: Hour-of-Day Heatmap

**Files:**
- Create: `src/components/admin/HourOfDayHeatmap.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useMemo } from 'react';
import { groupByHourPT } from '../../lib/admin/derive';
import type { MintEvent } from '../../lib/admin/types';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HourOfDayHeatmap({ events }: { events: MintEvent[] }) {
  const grid = useMemo(() => groupByHourPT(events), [events]);
  const max = useMemo(
    () => grid.reduce((m, c) => Math.max(m, c.count), 0),
    [grid],
  );

  return (
    <WidgetCard title="Hour of Day (PT)">
      {events.length === 0 ? (
        <WidgetEmpty>No mints yet.</WidgetEmpty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[10px]">
            <thead>
              <tr>
                <th className="px-1 text-left text-white/40">·</th>
                {Array.from({ length: 24 }).map((_, h) => (
                  <th
                    // biome-ignore lint/suspicious/noArrayIndexKey: hour index is the key
                    key={h}
                    className="px-0.5 text-center text-white/40"
                  >
                    {h % 6 === 0 ? h : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((label, dow) => (
                <tr key={label}>
                  <td className="px-1 text-white/40">{label}</td>
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const cell = grid.find(
                      (g) => g.dow === dow && g.hour === hour,
                    );
                    const intensity = max > 0 ? (cell?.count ?? 0) / max : 0;
                    return (
                      <td
                        // biome-ignore lint/suspicious/noArrayIndexKey: hour index is the key
                        key={hour}
                        title={`${label} ${hour}:00 — ${cell?.count ?? 0} mints`}
                        className="h-5 w-5 border border-[#0A1628]"
                        style={{
                          backgroundColor: `rgba(0, 82, 255, ${0.08 + intensity * 0.85})`,
                        }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/admin/HourOfDayHeatmap.tsx
git commit -m "feat(admin): hour-of-day heatmap (PT)"
```

---

## Task 13: Recent Mints Feed

**Files:**
- Create: `src/components/admin/RecentMintsFeed.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useMemo } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import { recentFeed } from '../../lib/admin/derive';
import { timeAgo, truncateAddress } from '../../lib/admin/format';
import type { MintEvent } from '../../lib/admin/types';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

export function RecentMintsFeed({
  chain,
  events,
}: { chain: AdminChain; events: MintEvent[] }) {
  const feed = useMemo(() => recentFeed(events, 20), [events]);

  return (
    <WidgetCard title="Recent Mints">
      {feed.length === 0 ? (
        <WidgetEmpty>No mints yet.</WidgetEmpty>
      ) : (
        <ul className="divide-y divide-white/5">
          {feed.map((e) => (
            <li
              key={e.txHash}
              className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-white/5"
            >
              <span className="font-mono text-white/80 tabular-nums">
                #{e.tokenId.toString()}
              </span>
              <a
                href={chain.explorerAddressUrl(e.to)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-white/60 hover:text-white"
                title={e.to}
              >
                {truncateAddress(e.to)}
              </a>
              <span className="text-white/40 text-xs">{timeAgo(e.timestamp)}</span>
              <a
                href={chain.explorerTxUrl(e.txHash)}
                target="_blank"
                rel="noreferrer"
                className="text-[#3380FF] hover:text-white"
                aria-label="View transaction"
              >
                ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/admin/RecentMintsFeed.tsx
git commit -m "feat(admin): recent mints feed"
```

---

## Task 14: Holders Table (with CSV export)

**Files:**
- Create: `src/components/admin/HoldersTable.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import { holders } from '../../lib/admin/derive';
import { formatPT, truncateAddress } from '../../lib/admin/format';
import type { MintEvent } from '../../lib/admin/types';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

const PAGE_SIZE = 50;

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function HoldersTable({
  chain,
  events,
}: { chain: AdminChain; events: MintEvent[] }) {
  const all = useMemo(() => holders(events), [events]);
  const [page, setPage] = useState(0);

  const start = page * PAGE_SIZE;
  const slice = all.slice(start, start + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));

  const onExport = () => {
    const rows: string[][] = [
      ['token_id', 'address', 'minted_at_unix', 'minted_at_pt'],
      ...all.map((h) => [
        h.tokenId.toString(),
        h.address,
        h.mintedAt.toString(),
        formatPT(h.mintedAt),
      ]),
    ];
    downloadCsv(`secret-stairs-${chain.slug}-holders.csv`, rows);
  };

  return (
    <WidgetCard
      title={`All Minters (${all.length})`}
      action={
        all.length > 0 ? (
          <button
            type="button"
            onClick={onExport}
            className="rounded border border-white/20 px-2 py-1 text-white/70 text-xs hover:bg-white/10"
          >
            ↓ CSV
          </button>
        ) : null
      }
    >
      {all.length === 0 ? (
        <WidgetEmpty>No minters yet.</WidgetEmpty>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 text-xs uppercase tracking-widest">
                <th className="py-2">#</th>
                <th>Address</th>
                <th className="text-right">Minted</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((h) => (
                <tr
                  key={`${h.tokenId.toString()}-${h.address}`}
                  className="border-white/5 border-t hover:bg-white/5"
                >
                  <td className="py-2 font-mono text-white/80 tabular-nums">
                    {h.tokenId.toString()}
                  </td>
                  <td>
                    <a
                      href={chain.explorerAddressUrl(h.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-white/70 hover:text-white"
                      title={h.address}
                    >
                      {truncateAddress(h.address)}
                    </a>
                  </td>
                  <td className="text-right font-mono text-white/50 text-xs">
                    {formatPT(h.mintedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 ? (
            <nav className="mt-3 flex items-center justify-between text-white/60 text-xs">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border border-white/20 px-2 py-1 disabled:opacity-30"
              >
                ‹ Prev
              </button>
              <span>
                Page {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded border border-white/20 px-2 py-1 disabled:opacity-30"
              >
                Next ›
              </button>
            </nav>
          ) : null}
        </>
      )}
    </WidgetCard>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/admin/HoldersTable.tsx
git commit -m "feat(admin): holders table with pagination and CSV export"
```

---

## Task 15: Wallet Type Breakdown

**Files:**
- Create: `src/components/admin/WalletTypeBreakdown.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useMemo } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import type { Address, MintEvent, WalletKind } from '../../lib/admin/types';
import { useWalletTypes } from '../../lib/admin/useWalletTypes';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';
import { WidgetError } from './WidgetError';
import { WidgetSkeleton } from './WidgetSkeleton';

export function WalletTypeBreakdown({
  chain,
  events,
}: { chain: AdminChain; events: MintEvent[] }) {
  const addresses = useMemo<Address[]>(
    () => [...new Set(events.map((e) => e.to))],
    [events],
  );
  const { data, isLoading, error, refetch } = useWalletTypes(chain, addresses);

  if (events.length === 0) {
    return (
      <WidgetCard title="Wallet Types">
        <WidgetEmpty>No mints yet.</WidgetEmpty>
      </WidgetCard>
    );
  }
  if (isLoading || !data) {
    return (
      <WidgetCard title="Wallet Types">
        <WidgetSkeleton rows={2} />
      </WidgetCard>
    );
  }
  if (error) {
    return (
      <WidgetCard title="Wallet Types">
        <WidgetError message={error.message} onRetry={() => refetch()} />
      </WidgetCard>
    );
  }

  const counts: Record<WalletKind, number> = { smart: 0, eoa: 0 };
  for (const k of Object.values(data)) {
    counts[k] += 1;
  }
  const total = counts.smart + counts.eoa;
  const smartPct = total === 0 ? 0 : Math.round((counts.smart / total) * 100);
  const eoaPct = 100 - smartPct;

  return (
    <WidgetCard title="Wallet Types">
      <div className="space-y-3">
        <div className="h-4 w-full overflow-hidden rounded bg-white/10">
          <div className="flex h-full">
            <div
              className="bg-[#0052FF]"
              style={{ width: `${smartPct}%` }}
              title={`Smart wallets: ${counts.smart}`}
            />
            <div
              className="bg-white/40"
              style={{ width: `${eoaPct}%` }}
              title={`EOAs: ${counts.eoa}`}
            />
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/80">
            <span className="inline-block h-2 w-2 rounded-sm bg-[#0052FF]" />{' '}
            Smart Wallet — {counts.smart} ({smartPct}%)
          </span>
          <span className="text-white/60">
            <span className="inline-block h-2 w-2 rounded-sm bg-white/40" /> EOA
            — {counts.eoa} ({eoaPct}%)
          </span>
        </div>
        <p className="text-white/40 text-xs">
          Detected via on-chain bytecode check (smart wallets are contracts).
        </p>
      </div>
    </WidgetCard>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/admin/WalletTypeBreakdown.tsx
git commit -m "feat(admin): wallet type breakdown widget"
```

---

## Task 16: Pass Detail Modal

**Files:**
- Create: `src/components/admin/PassDetailModal.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useEffect } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import { formatPT, truncateAddress } from '../../lib/admin/format';
import type { MintEvent } from '../../lib/admin/types';
import { useTokenMetadata } from '../../lib/admin/useTokenMetadata';
import { WidgetSkeleton } from './WidgetSkeleton';

export function PassDetailModal({
  chain,
  mint,
  onClose,
}: {
  chain: AdminChain;
  mint: MintEvent;
  onClose: () => void;
}) {
  const { data, isLoading } = useTokenMetadata(chain, mint.tokenId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!chain.contractAddress) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClose();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Close modal"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-white/20 bg-[#0A1628] p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between">
          <h3 className="font-bold font-mono text-lg text-white">
            {data?.name ?? `Pass #${mint.tokenId.toString()}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 text-xl hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-4">
          {isLoading || !data ? (
            <div className="aspect-square w-full rounded-lg bg-white/5">
              <WidgetSkeleton rows={6} />
            </div>
          ) : (
            // biome-ignore lint/a11y/useAltText: SVG is decorative; name shown in heading
            <img
              src={data.imageDataUri}
              alt={data.name}
              className="aspect-square w-full rounded-lg"
            />
          )}
        </div>

        {data ? (
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {data.attributes.map((a) => (
              <div key={a.trait_type} className="rounded bg-white/5 p-2">
                <dt className="text-white/40 text-xs uppercase">{a.trait_type}</dt>
                <dd className="text-white">{String(a.value)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-white/50">Owner</dt>
            <dd>
              <a
                href={chain.explorerAddressUrl(mint.to)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-white hover:text-[#3380FF]"
              >
                {truncateAddress(mint.to)} ↗
              </a>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/50">Minted</dt>
            <dd className="font-mono text-white">{formatPT(mint.timestamp)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/50">Tx</dt>
            <dd>
              <a
                href={chain.explorerTxUrl(mint.txHash)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-white hover:text-[#3380FF]"
              >
                {truncateAddress(mint.txHash)} ↗
              </a>
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <a
            href={chain.explorerTokenUrl(chain.contractAddress, mint.tokenId)}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-white/20 px-2 py-1 text-white/70 hover:bg-white/10"
          >
            BaseScan ↗
          </a>
          <a
            href={chain.blockscoutTokenUrl(chain.contractAddress)}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-white/20 px-2 py-1 text-white/70 hover:bg-white/10"
          >
            Blockscout ↗
          </a>
          <a
            href={chain.thirdwebTokenUrl(chain.contractAddress, mint.tokenId)}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-white/20 px-2 py-1 text-white/70 hover:bg-white/10"
          >
            Thirdweb ↗
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/admin/PassDetailModal.tsx
git commit -m "feat(admin): pass detail modal with metadata and explorer links"
```

---

## Task 17: Pass Gallery

**Files:**
- Create: `src/components/admin/PassGallery.tsx`

The gallery uses two patterns:
1. A small inner `GalleryTile` that fires `useTokenMetadata` per token (React Query dedupes & caches forever).
2. A sort selector and an "open modal" handler that lifts state to the parent.

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import type { MintEvent } from '../../lib/admin/types';
import { useTokenMetadata } from '../../lib/admin/useTokenMetadata';
import { PassDetailModal } from './PassDetailModal';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

type SortKey = 'newest' | 'oldest' | 'token-asc';

function GalleryTile({
  chain,
  mint,
  onOpen,
}: { chain: AdminChain; mint: MintEvent; onOpen: () => void }) {
  const { data, isLoading } = useTokenMetadata(chain, mint.tokenId);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex aspect-square flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5 hover:border-[#0052FF]/60"
    >
      <div className="flex flex-1 items-center justify-center bg-black/20">
        {isLoading || !data ? (
          <span className="font-mono text-white/30 text-xs">loading…</span>
        ) : (
          // biome-ignore lint/a11y/useAltText: tile is part of a button with token id label below
          <img
            src={data.imageDataUri}
            alt={data.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <span className="bg-black/40 py-1 text-center font-mono text-[10px] text-white/70">
        #{mint.tokenId.toString()}
      </span>
    </button>
  );
}

export function PassGallery({
  chain,
  events,
}: { chain: AdminChain; events: MintEvent[] }) {
  const [sort, setSort] = useState<SortKey>('newest');
  const [openMint, setOpenMint] = useState<MintEvent | null>(null);

  const sorted = useMemo(() => {
    const arr = [...events];
    switch (sort) {
      case 'newest':
        arr.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        arr.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'token-asc':
        arr.sort((a, b) => (a.tokenId < b.tokenId ? -1 : 1));
        break;
    }
    return arr;
  }, [events, sort]);

  return (
    <>
      <WidgetCard
        title={`Gallery (${events.length})`}
        action={
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded border border-white/20 bg-white/5 px-2 py-1 text-white text-xs"
          >
            <option value="newest" className="bg-[#0A1628]">Newest</option>
            <option value="oldest" className="bg-[#0A1628]">Oldest</option>
            <option value="token-asc" className="bg-[#0A1628]">Token ID ↑</option>
          </select>
        }
      >
        {sorted.length === 0 ? (
          <WidgetEmpty>No passes yet.</WidgetEmpty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {sorted.map((m) => (
              <GalleryTile
                key={m.txHash}
                chain={chain}
                mint={m}
                onOpen={() => setOpenMint(m)}
              />
            ))}
          </div>
        )}
      </WidgetCard>
      {openMint ? (
        <PassDetailModal
          chain={chain}
          mint={openMint}
          onClose={() => setOpenMint(null)}
        />
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
npm run lint
git add src/components/admin/PassGallery.tsx
git commit -m "feat(admin): pass gallery with sort and detail modal"
```

---

## Task 18: Admin Layout & Routing

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/[chain]/page.tsx`

- [ ] **Step 1: Implement layout**

Create `src/app/admin/layout.tsx`:

```tsx
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen w-full text-white"
      style={{
        background:
          'linear-gradient(135deg, #050A14 0%, #0A1628 100%)',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement root admin redirect**

Create `src/app/admin/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { DEFAULT_CHAIN_SLUG } from '../../lib/admin/chains';

export default function AdminIndex() {
  redirect(`/admin/${DEFAULT_CHAIN_SLUG}`);
}
```

- [ ] **Step 3: Implement the dashboard page**

Create `src/app/admin/[chain]/page.tsx`:

```tsx
'use client';

import { notFound } from 'next/navigation';
import { ADMIN_CHAINS, getChain } from '../../../lib/admin/chains';
import { useMintEvents } from '../../../lib/admin/useMintEvents';
import { AdminHeader } from '../../../components/admin/AdminHeader';
import { HoldersTable } from '../../../components/admin/HoldersTable';
import { HourOfDayHeatmap } from '../../../components/admin/HourOfDayHeatmap';
import { MintsOverTimeChart } from '../../../components/admin/MintsOverTimeChart';
import { PassGallery } from '../../../components/admin/PassGallery';
import { RecentMintsFeed } from '../../../components/admin/RecentMintsFeed';
import { StatCards } from '../../../components/admin/StatCards';
import { WalletTypeBreakdown } from '../../../components/admin/WalletTypeBreakdown';
import { WidgetCard } from '../../../components/admin/WidgetCard';
import { WidgetEmpty } from '../../../components/admin/WidgetEmpty';
import { WidgetError } from '../../../components/admin/WidgetError';
import { WidgetSkeleton } from '../../../components/admin/WidgetSkeleton';

export default function AdminChainPage({
  params,
}: { params: { chain: string } }) {
  if (!ADMIN_CHAINS[params.chain]) {
    notFound();
  }
  const chain = getChain(params.chain);
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } =
    useMintEvents(chain);

  const events = data ?? [];

  return (
    <div className="space-y-6">
      <AdminHeader
        chain={chain}
        isFetching={isFetching}
        dataUpdatedAt={dataUpdatedAt}
        onRefresh={() => refetch()}
      />

      {chain.contractAddress === null ? (
        <WidgetCard>
          <WidgetEmpty>
            {chain.name} contract not deployed yet. Add the address in{' '}
            <code className="rounded bg-white/10 px-1 font-mono text-xs">
              src/lib/admin/chains.ts
            </code>{' '}
            to enable.
          </WidgetEmpty>
        </WidgetCard>
      ) : isLoading ? (
        <WidgetCard title="Loading">
          <WidgetSkeleton rows={4} />
        </WidgetCard>
      ) : error ? (
        <WidgetCard title="Error">
          <WidgetError message={error.message} onRetry={() => refetch()} />
        </WidgetCard>
      ) : (
        <>
          <StatCards events={events} />
          <MintsOverTimeChart events={events} />
          <div className="grid gap-6 lg:grid-cols-2">
            <HourOfDayHeatmap events={events} />
            <WalletTypeBreakdown chain={chain} events={events} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <RecentMintsFeed chain={chain} events={events} />
            <HoldersTable chain={chain} events={events} />
          </div>
          <PassGallery chain={chain} events={events} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin
git commit -m "feat(admin): layout, routing, and composed dashboard page"
```

---

## Task 19: Document Optional Env Vars

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Append the new optional vars**

Append to `.env.local.example`:

```
# Optional: private RPC URLs for the admin dashboard (improves rate-limits and
# reliability vs the default public viem RPCs). Leave unset to use defaults.
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=""
NEXT_PUBLIC_BASE_RPC_URL=""
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "docs: document optional admin RPC env vars"
```

---

## Task 20: End-to-End Manual Verification

This is the final verification. No new code; we run the app and confirm everything works.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: build succeeds with no type errors. (If recharts pulls in a server-incompatible import, the page is `'use client'` so it should be fine; but watch for warnings.)

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

In the browser:
- [ ] Visit `http://localhost:3000/admin` → redirects to `/admin/base-sepolia`
- [ ] Header shows "Base Sepolia" + truncated contract address + "Xs ago" + spinning refresh icon while data loads
- [ ] Stat cards populate with real numbers from chain
- [ ] Mints-over-time chart renders bars + cumulative line
- [ ] Hour-of-day heatmap renders 7×24 cells with at least one tinted cell
- [ ] Wallet type breakdown shows Smart vs EOA percentages
- [ ] Recent mints feed shows the latest mints with explorer links that open
- [ ] Holders table is paginated; CSV download produces a valid file
- [ ] Gallery shows on-chain SVG art for each pass
- [ ] Clicking a gallery tile opens the modal with full art, attributes, and three explorer links (BaseScan, Blockscout, Thirdweb) that all open
- [ ] Switching the chain to "Base (coming soon)" shows the "not deployed yet" empty state and the contract link disappears
- [ ] Visit `/admin/mars` → 404 page
- [ ] Visit the existing mint page `/` → still looks correct (centered)

If any of the above fails, fix before moving on.

- [ ] **Step 5: Final commit (if anything changed during verification)**

If you made fixes during the smoke test, commit them with appropriate messages.

If nothing changed, no commit needed.

---

## Self-Review

**Spec coverage check** (mapped from `2026-04-29-admin-dashboard-design.md`):

| Spec section | Implementing task |
|---|---|
| Routing & file layout | Tasks 2, 8–18 |
| Chain registry | Task 2 |
| `useMintEvents` contract | Task 5 |
| `useTokenMetadata` contract | Task 6 |
| `useWalletTypes` contract | Task 7 |
| Pure derivations (totals/groupByDay/Hour/holders/recentFeed) | Task 4 |
| AdminHeader, ChainSwitcher | Task 9 |
| StatCards | Task 10 |
| MintsOverTimeChart (Recharts) | Tasks 1, 11 |
| HourOfDayHeatmap | Task 12 |
| WalletTypeBreakdown | Task 15 |
| RecentMintsFeed | Task 13 |
| HoldersTable + CSV download | Task 14 |
| PassGallery | Task 17 |
| PassDetailModal (3 explorer links) | Task 16 |
| Shared chrome (WidgetCard / Skeleton / Error / Empty) | Task 8 |
| Visual design (dark gradient, Coinbase blue, mono accents) | Tasks 8–18 (consistent across) |
| Responsive (4-up → 2x2 → stacked) | Tasks 10, 18 |
| Loading / error / empty states per widget | Tasks 8, 11–17 |
| Chain-not-deployed state | Task 18 |
| Optional env vars | Task 19 |
| Tests for derivations / formatters / chains | Tasks 2, 3, 4 |
| Layout root unbinding | Task 0 |

All spec items have a task. ✓

**Placeholder scan:** Only one intentional placeholder remains: `<DEPLOY_BLOCK>` in Task 2 Step 4. This is **explicitly resolved by Task 2 Step 1** (look up the value), and Task 2 Step 1 provides a fallback (`0n`) if the lookup is impossible. ✓

**Type consistency check:**
- `MintEvent` shape consistent across Tasks 3, 4, 5, 13, 14, 16, 17. ✓
- `AdminChain` fields used: `slug`, `name`, `contractAddress`, `viemChain`, `rpcUrl`, `deployBlock`, `explorerTxUrl`, `explorerAddressUrl`, `explorerTokenUrl`, `thirdwebTokenUrl`, `blockscoutTokenUrl`. All defined in Task 2. ✓
- `useMintEvents` returns React Query result with `data`, `isLoading`, `isFetching`, `error`, `refetch`, `dataUpdatedAt` — all consumed in Task 18. ✓
- `useTokenMetadata` consumed in Tasks 16, 17. ✓
- `useWalletTypes` consumed in Task 15. ✓
- Pure functions `totals`, `groupByDay`, `groupByHourPT`, `holders`, `recentFeed` defined in Task 4 and consumed in Tasks 10, 11, 12, 13, 14. ✓
- `truncateAddress`, `timeAgo`, `formatPT` defined in Task 3, consumed in Tasks 9, 13, 14, 16. ✓

All clear.
