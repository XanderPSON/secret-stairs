import { useQuery } from '@tanstack/react-query';
import { type Log, parseAbiItem } from 'viem';
import {
  LOCATIONS,
  LOCATION_SLUGS,
  type Location,
  type LocationSlug,
} from '../locations';
import { ADMIN_CHAINS, type AdminChain, getChain } from './chains';
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

async function fetchMintEventsForLocation(
  location: Location,
): Promise<MintEvent[]> {
  if (!location.contractAddress) {
    return [];
  }
  const chain = getChain(location.chainSlug);
  const client = getPublicClient(chain);
  const latest = await client.getBlockNumber();

  const ranges: { from: bigint; to: bigint }[] = [];
  for (let from = location.deployBlock; from <= latest; from += BATCH_SIZE) {
    const to =
      from + BATCH_SIZE - 1n > latest ? latest : from + BATCH_SIZE - 1n;
    ranges.push({ from, to });
  }

  const logBatches = await withConcurrency(ranges, BATCH_CONCURRENCY, (range) =>
    client.getLogs({
      address: location.contractAddress as `0x${string}`,
      event: TRANSFER_EVENT,
      args: { from: '0x0000000000000000000000000000000000000000' },
      fromBlock: range.from,
      toBlock: range.to,
    }),
  );

  const logs: Log[] = logBatches.flat();

  const uniqueBlocks = [
    ...new Set(
      logs.map((log) => {
        const blockNumber = log.blockNumber;
        if (blockNumber === null) {
          throw new Error('Expected confirmed log with blockNumber');
        }
        return blockNumber;
      }),
    ),
  ];
  const blocks = await withConcurrency(
    uniqueBlocks,
    TIMESTAMP_CONCURRENCY,
    (bn) => client.getBlock({ blockNumber: bn }),
  );
  const tsByBlock = new Map<bigint, number>();
  for (const b of blocks) {
    const blockNumber = b.number;
    if (blockNumber === null) {
      throw new Error('Expected confirmed block with number');
    }
    tsByBlock.set(blockNumber, Number(b.timestamp));
  }

  return logs.map((log) => {
    const args = (
      log as unknown as { args: { to: `0x${string}`; tokenId: bigint } }
    ).args;
    const blockNumber = log.blockNumber;
    if (blockNumber === null) {
      throw new Error('Expected confirmed log with blockNumber');
    }
    const txHash = log.transactionHash;
    if (txHash === null) {
      throw new Error('Expected confirmed log with transactionHash');
    }
    return {
      tokenId: args.tokenId,
      to: args.to,
      blockNumber,
      txHash,
      timestamp: tsByBlock.get(blockNumber) ?? 0,
      location: location.slug,
    };
  });
}

async function fetchMintEventsForLocations(
  locations: readonly Location[],
): Promise<MintEvent[]> {
  const perLocation = await Promise.all(
    locations.map((loc) => fetchMintEventsForLocation(loc)),
  );
  const flat = perLocation.flat();
  return flat.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber < b.blockNumber ? -1 : 1;
    }
    return a.tokenId < b.tokenId ? -1 : 1;
  });
}

export function useMintEventsByLocation(locations: readonly Location[]) {
  const slugs = locations.map((l) => l.slug).join(',');
  return useQuery({
    queryKey: ['admin', 'mintEventsByLocation', slugs],
    queryFn: () => fetchMintEventsForLocations(locations),
    enabled: locations.length > 0,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

// Helper: pick the AdminChain to use for explorer URLs and per-event chain
// context when widgets receive a merged dataset. Prefers the chain of the
// only location being viewed, otherwise falls back to the first location's
// chain (works because all current locations share base-sepolia).
export function chainForLocations(locations: readonly Location[]): AdminChain {
  if (locations.length === 0) {
    return getChain('base-sepolia');
  }
  return getChain(locations[0].chainSlug);
}

export function locationsForFilter(filter: LocationSlug | 'all'): Location[] {
  if (filter === 'all') {
    return LOCATION_SLUGS.map((s) => LOCATIONS[s]);
  }
  return [LOCATIONS[filter]];
}

export { ADMIN_CHAINS };
