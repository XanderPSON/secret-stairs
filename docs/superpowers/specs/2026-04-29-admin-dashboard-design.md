# Admin Dashboard — Design Spec

**Date:** 2026-04-29
**Status:** Approved (pending user review of this written spec)
**Author:** Sisyphus
**Project:** secret-stairs

## Problem

The Coinbase app does not display Base Sepolia NFTs, so the only way to inspect minted Welcome Passes today is through third-party explorers (Thirdweb, Blockscout). We want a first-party admin dashboard that:

1. Shows every WelcomeNFT minted on Base Sepolia (and later, Base mainnet).
2. Surfaces useful analytics about adoption: totals, mints over time, time-of-day patterns, holder list, wallet-type breakdown.
3. Provides a visual gallery of the on-chain SVG art.

## Goals

- Read-only dashboard at `/admin/[chain]` with a chain switcher.
- Pre-wired for Base Sepolia today; Base mainnet enabled by adding one entry to a chain registry once the contract is deployed there.
- Zero new infra: client-side data fetching via viem, React Query for caching, no database.
- Match the existing site aesthetic (dark gradient, Coinbase blue, monospace accents).
- All seven analytics widgets requested: stat cards, mints-over-time chart, hour-of-day heatmap, holders table, recent feed, gallery, smart-wallet vs EOA breakdown.

## Non-Goals

- Authentication / access control. The dashboard is public (data is on-chain anyway). Won't be linked from the homepage.
- Server-side caching, indexers, or databases. Client-side viem is sufficient for the current scale (low hundreds of mints).
- Write operations. Read-only for now.
- Multi-contract support beyond WelcomeNFT.
- Real-time websocket subscriptions. Polling at 30s intervals is sufficient.
- Mobile-first dense data viz. Mobile is supported (responsive) but the dashboard is primarily desktop.

## Architecture

### Tech Choices

- **Routing:** Next.js App Router, new segment `src/app/admin/`.
- **Data fetching:** viem (already a dep) for `getLogs`, `getBlock`, `getCode`, `readContract`.
- **Caching / state:** React Query (already a dep via `@tanstack/react-query`).
- **Charts:** Recharts (new dep) for time-series chart. Heatmap is hand-rolled SVG (simple grid, doesn't need a library).
- **Styling:** Tailwind (already configured), matching existing color tokens.
- **No new infra:** no DB, no API routes (beyond what already exists), no server actions.

### Routing & File Layout

```
src/app/admin/
  layout.tsx                  # dark gradient bg, header w/ chain switcher
  page.tsx                    # redirects to /admin/base-sepolia
  [chain]/
    page.tsx                  # the dashboard for the given chain slug

src/lib/admin/
  chains.ts                   # ADMIN_CHAINS registry
  publicClient.ts             # memoized viem PublicClient per chain
  useMintEvents.ts            # React Query hook: Transfer events from deployBlock
  useTokenMetadata.ts         # React Query hook: tokenURI decode per token
  useWalletTypes.ts           # React Query hook: getCode for each unique minter
  derive.ts                   # pure derivations (groupByDay, topHolders, etc.)
  format.ts                   # address truncation, time-ago, PT formatting

src/components/admin/
  AdminHeader.tsx             # logo, chain switcher, contract link, refresh state
  ChainSwitcher.tsx
  StatCards.tsx
  MintsOverTimeChart.tsx
  HourOfDayHeatmap.tsx
  WalletTypeBreakdown.tsx
  RecentMintsFeed.tsx
  HoldersTable.tsx
  PassGallery.tsx
  PassDetailModal.tsx
  WidgetCard.tsx              # shared card chrome (border, padding, header)
  WidgetSkeleton.tsx          # shared skeleton loader
  WidgetError.tsx             # shared error state w/ retry
  WidgetEmpty.tsx             # shared empty state
```

### Chain Registry

Single source of truth for which chains the dashboard supports:

```ts
// src/lib/admin/chains.ts
import { base, baseSepolia } from 'viem/chains';

export type AdminChain = {
  id: number;
  slug: 'base-sepolia' | 'base';
  name: string;                              // "Base Sepolia"
  viemChain: typeof base | typeof baseSepolia;
  contractAddress: `0x${string}` | null;     // null = not yet deployed
  deployBlock: bigint;                       // first block to scan
  rpcUrl: string;                            // overridable via env
  blockTimeSec: number;                      // ~2 for Base
  explorerName: string;                      // "BaseScan"
  explorerTxUrl: (hash: string) => string;
  explorerAddressUrl: (addr: string) => string;
  explorerTokenUrl: (addr: string, tokenId: bigint) => string;
  thirdwebTokenUrl: (addr: string, tokenId: bigint) => string;
};

export const ADMIN_CHAINS: Record<string, AdminChain> = {
  'base-sepolia': {
    id: 84532,
    slug: 'base-sepolia',
    name: 'Base Sepolia',
    viemChain: baseSepolia,
    contractAddress: '0x803CcC4C17568d6213051a607D1ecFE8De1bdF35',
    deployBlock: /* see "Determining deployBlock" below */,
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || /* viem default */,
    blockTimeSec: 2,
    explorerName: 'BaseScan',
    explorerTxUrl: (h) => `https://sepolia.basescan.org/tx/${h}`,
    explorerAddressUrl: (a) => `https://sepolia.basescan.org/address/${a}`,
    explorerTokenUrl: (a, id) => `https://sepolia.basescan.org/token/${a}?a=${id}`,
    thirdwebTokenUrl: (a, id) => `https://thirdweb.com/base-sepolia-testnet/${a}/nfts/${id}`,
  },
  'base': {
    id: 8453,
    slug: 'base',
    name: 'Base',
    viemChain: base,
    contractAddress: null,                 // TODO: fill in after mainnet deploy
    deployBlock: 0n,                       // TODO: fill in after mainnet deploy
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || /* viem default */,
    blockTimeSec: 2,
    explorerName: 'BaseScan',
    explorerTxUrl: (h) => `https://basescan.org/tx/${h}`,
    explorerAddressUrl: (a) => `https://basescan.org/address/${a}`,
    explorerTokenUrl: (a, id) => `https://basescan.org/token/${a}?a=${id}`,
    thirdwebTokenUrl: (a, id) => `https://thirdweb.com/base/${a}/nfts/${id}`,
  },
};

export const DEFAULT_CHAIN_SLUG = 'base-sepolia';
export function getChain(slug: string): AdminChain { /* throws if unknown */ }
```

**Determining `deployBlock`** (Base Sepolia): the contract `0x803CcC4C17568d6213051a607D1ecFE8De1bdF35` was deployed at a specific block. The implementer should look this up via `https://sepolia.basescan.org/address/0x803CcC4C17568d6213051a607D1ecFE8De1bdF35` (the contract creation tx's block number) and hardcode it. If the implementer cannot determine it, fall back to scanning from `0n` — slower first load but correct.

Adding Base mainnet later = filling in `contractAddress` and `deployBlock` for the `'base'` entry. No other code changes.

### Data Flow

```
                     ┌──────────────────────────┐
                     │  useMintEvents(chain)    │
                     │  ─ getLogs in 10k batches│
                     │  ─ resolve block times   │
                     │  ─ React Query cached    │
                     └────────────┬─────────────┘
                                  │ MintEvent[]
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
       derive.ts            useWalletTypes      useTokenMetadata
   (pure, in useMemo)        (per address)       (per tokenId)
            │                     │                     │
            ▼                     ▼                     ▼
    StatCards, Chart,    WalletTypeBreakdown      PassGallery
    Heatmap, Feed,                                PassDetailModal
    HoldersTable
```

`useMintEvents` is the single source of truth. All scalar widgets derive from it via pure functions wrapped in `useMemo`. Two heavier widgets (`PassGallery`, `WalletTypeBreakdown`) fetch additional data keyed on the events.

### `useMintEvents` — implementation contract

**Input:** `AdminChain` (or returns `disabled: true` if `contractAddress` is null)

**Output:**
```ts
type MintEvent = {
  tokenId: bigint;
  to: `0x${string}`;
  blockNumber: bigint;
  txHash: `0x${string}`;
  timestamp: number;  // unix seconds
};
```

**Behavior:**
1. Build `eventFilter`: `Transfer(from indexed = 0x0, to indexed, tokenId indexed)` — i.e. only mints, not transfers.
2. Fetch the current `latest` block number once per query invocation. From `chain.deployBlock` to that latest block, fetch logs in **10,000-block windows**, parallelized at concurrency **4**.
3. For all unique `blockNumber`s in the result, fetch `getBlock({ blockNumber, includeTransactions: false })` in parallel (concurrency 8) and build a map of `blockNumber → timestamp`.
4. Map logs → `MintEvent[]`, sorted ascending by `(blockNumber, logIndex)`.
5. React Query config: `queryKey: ['mintEvents', chain.slug]`, `staleTime: 30_000`, `refetchInterval: 30_000`, `refetchOnWindowFocus: true`.
6. Errors are bubbled up to widgets via React Query's `error` field.

**Note on freshness:** every refetch re-scans from `deployBlock`. At our scale (low hundreds of mints across ~tens of millions of blocks but only a handful with logs), this is acceptable. If we ever grow to needing incremental scans, a future improvement is to cache prior results and only scan from the last seen block — but explicitly out of scope for v1 (YAGNI).

**Caveats documented in code:**
- 10k-block window chosen for compatibility with Alchemy/QuickNode/public Base RPCs.
- For very long histories (millions of blocks), this is O(blocks/10k) RPC calls. Currently fine.
- If the user provides `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` we use that, else fall back to the public viem default RPC for the chain.

### `useTokenMetadata` — implementation contract

**Input:** `AdminChain`, `tokenId: bigint`

**Output:**
```ts
{
  name: string;
  description: string;
  imageDataUri: string;     // ready for <img src>
  attributes: { trait_type: string; value: string }[];
}
```

**Behavior:**
- `readContract({ address, abi: welcomeNftAbi, functionName: 'tokenURI', args: [tokenId] })`
- Strip `data:application/json;base64,` prefix, base64-decode, JSON-parse.
- React Query: `queryKey: ['tokenMetadata', chain.slug, tokenId.toString()]`, `staleTime: Infinity` (token art is immutable), `gcTime: Infinity`.

### `useWalletTypes` — implementation contract

**Input:** `AdminChain`, `addresses: readonly Address[]`

**Output:** `Map<Address, 'smart' | 'eoa'>`

**Behavior:**
- For each unique address, `getCode(address)`. Non-empty bytecode → `'smart'`, else `'eoa'`.
- Concurrency 8. React Query keyed per `(chain.slug, address)` with `staleTime: Infinity`.
- Note in code: smart-wallet-vs-EOA via `getCode` is heuristic; in this app's context (`smartWalletOnly` connector preference) it's accurate.

### Derivations (`derive.ts`)

All pure, all consume `MintEvent[]`:

```ts
totals(events): { total: number; today: number; thisWeek: number; uniqueMinters: number }
groupByDay(events, tz='America/Los_Angeles'): { date: string; count: number; cumulative: number }[]
groupByHourPT(events): { dow: 0..6; hour: 0..23; count: number }[]
recentFeed(events, limit=20): MintEvent[]      // sorted desc by timestamp
holders(events): { address: Address; tokenId: bigint; mintedAt: number }[]   // sorted desc
```

Date math uses `Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', ... })` — no `date-fns` or `dayjs` needed for this scope.

## Components

### `AdminHeader`

Logo (text "STAIRS / Admin Dashboard"), chain switcher, contract address (truncated, click-to-copy + opens explorer), "Last updated Xs ago" + refresh button (spins while `isFetching`).

### `StatCards`

Four tiles: Total · Today · This Week · Unique Minters. Each derived from `totals()`. "Today" and "This Week" show delta vs prior period in small text below.

### `MintsOverTimeChart`

Recharts `<ComposedChart>`: bars = daily mints, line = cumulative. X-axis = date. Y-axis left = daily count, right = cumulative. Coinbase blue bars, lighter blue line.

### `HourOfDayHeatmap`

Hand-rolled SVG: 7-row × 24-column grid. Cells colored by relative intensity (`#0052FF` at varying alpha). Tooltip on hover: "Wed 11am — 7 mints". Day-of-week and hour labels.

### `WalletTypeBreakdown`

Horizontal stacked bar + counts/percentages. While `useWalletTypes` is loading, shows skeleton. Tooltip explains "smart wallet detected via on-chain bytecode check".

### `RecentMintsFeed`

Last 20 mints. Each row: `#tokenId  0xabc…123  3 min ago  ⧉` where `⧉` opens the tx on the explorer. Auto-updates as `useMintEvents` refetches.

### `HoldersTable`

All minters, paginated (50/page), sortable by token ID or mint time. Address column is click-to-copy + explorer link. Includes a "Download CSV" button (client-side blob download — no server).

### `PassGallery`

Responsive grid of all minted passes. Each tile shows the SVG art (from `useTokenMetadata`) + token ID. Sort: newest / oldest / by minter address. Click → `PassDetailModal`.

### `PassDetailModal`

Full-size SVG, all `attributes`, owner address (with explorer link), mint tx hash (with explorer link), mint timestamp in PT, plus links to view on BaseScan, Blockscout, and Thirdweb.

### Shared chrome

`WidgetCard`, `WidgetSkeleton`, `WidgetError`, `WidgetEmpty` — unify the look and behavior across widgets so loading/error/empty states are consistent and one widget's failure doesn't break others.

## Visual Design

- **Background:** existing site gradient `#050A14 → #0A1628` (linear, 135deg).
- **Card chrome:** `bg-white/5`, `border border-white/10`, `rounded-xl`, `backdrop-blur-sm`, `p-5`.
- **Accent:** `#0052FF` (primary), `#3380FF` (muted accent), `#0A1628` (deep bg).
- **Text:** white primary, `text-white/60` secondary, `text-white/40` tertiary.
- **Numbers, addresses, token IDs:** monospace, `tracking-tight`.
- **Section labels:** uppercase, `text-xs`, `tracking-widest`, `text-white/50`.
- **Hover:** rows and gallery tiles shift to `bg-white/10`.
- **Focus rings:** `ring-2 ring-[#0052FF]` for accessibility.

## Responsive

- ≥`xl` (1280px+): full layout as in the ASCII diagram.
- `lg` (1024px): stat cards 4-up, two-column rows collapse to stacked.
- `md` (768px): stat cards 2x2.
- `sm` (≤640px): everything stacked, gallery 2 cols.

## Loading / Error / Empty States

- **Page load:** `useMintEvents` fires immediately. All widgets show skeletons. As soon as data arrives (~1–3s typical), widgets populate together.
- **Refetch (30s polling):** widgets stay populated; subtle "fetching" spinner in header. No layout shift.
- **Per-widget error:** widget shows `WidgetError` (red-tinted card, message, retry button). Other widgets keep working.
- **Empty state (no mints):** `WidgetEmpty` with a friendly message and the contract address linked to the explorer.
- **Chain not deployed (`contractAddress: null`):** entire dashboard body replaced with "Base mainnet contract not deployed yet. Add the address in `src/lib/admin/chains.ts` to enable."

## Environment Variables

New, optional:

```
# .env.local.example additions
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=""   # optional; falls back to viem default
NEXT_PUBLIC_BASE_RPC_URL=""           # optional; for when Base mainnet contract is deployed
```

If unset, viem's bundled public RPC URLs for `baseSepolia` / `base` are used.

## Testing

Per existing project conventions (vitest already configured), unit tests for the parts where bugs would silently distort the dashboard:

- `derive.test.ts`: golden-input tests for `totals`, `groupByDay`, `groupByHourPT`, `holders`, `recentFeed`. PT timezone correctness around DST and midnight.
- `chains.test.ts`: `getChain` throws on unknown slug, registry shape sanity.
- `format.test.ts`: address truncation, time-ago strings.

Component-level tests are skipped — they'd mostly be testing Recharts and React Query, which are not our code. Manual verification covers the visual layer.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Public RPC rate limits / 10k-block cap | Batched in 10k windows, concurrency 4. Env var escape hatch for private RPC. |
| Slow first paint as mints grow | Skeletons everywhere. If we ever hit thousands of mints, switch to server-side caching (still no DB needed — just `unstable_cache` on a `getMintEvents` server function). |
| `tokenURI` decoding is brittle to contract changes | Strict assertion that the URI starts with `data:application/json;base64,`; on parse failure, gallery tile shows a placeholder card with the token ID (doesn't crash the page). |
| Smart-wallet detection is heuristic | Tooltip explains the method. In this app's context (`smartWalletOnly`) it's accurate. |
| Public dashboard reveals all minters | Acceptable — same data is already public on BaseScan/Thirdweb/Blockscout. |
| RPC reorg / consistency | Negligible at our scale; Base finalizes quickly. We accept up to one block of staleness. |

## Out of Scope (future)

- Auth / allowlist if we ever want to lock the dashboard.
- Server-side caching with `unstable_cache` if mint count grows past ~10k.
- Indexer (Goldsky / Ponder) if we add multiple contracts or need cross-contract queries.
- Webhook / websocket live updates instead of polling.
- Multi-contract dashboard (e.g., a future second NFT).
- Embeddable widget for the homepage ("X passes minted").
