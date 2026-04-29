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

  const events: MintEvent[] = logs.map((log) => {
    // Decoded args present because we passed `event: TRANSFER_EVENT`.
    const args = (log as unknown as { args: { to: `0x${string}`; tokenId: bigint } }).args;
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
