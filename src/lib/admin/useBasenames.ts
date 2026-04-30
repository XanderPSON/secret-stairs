import { useQuery } from '@tanstack/react-query';
import { http, createPublicClient, toCoinType } from 'viem';
import { base, mainnet } from 'viem/chains';
import type { Address } from './types';

// Resolution per ENSIP-19 starts on Ethereum mainnet via the Universal
// Resolver and crosses to Base via state proofs. A private RPC is required —
// public mainnet endpoints will rate-limit or refuse the call.
const ETH_MAINNET_RPC_URL = process.env.NEXT_PUBLIC_ETH_MAINNET_RPC_URL;

let cachedClient: ReturnType<typeof createPublicClient> | null = null;
function getMainnetClient() {
  if (!ETH_MAINNET_RPC_URL) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createPublicClient({
      chain: mainnet,
      transport: http(ETH_MAINNET_RPC_URL),
    });
  }
  return cachedClient;
}

const BASE_COIN_TYPE = toCoinType(base.id);
const CONCURRENCY = 4;

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

async function resolveOne(
  client: NonNullable<ReturnType<typeof getMainnetClient>>,
  addr: Address,
): Promise<string | null> {
  // Try Basename (Base mainnet coinType) first; fall back to standard ENS.
  try {
    const baseName = await client.getEnsName({
      address: addr,
      coinType: BASE_COIN_TYPE,
    });
    if (baseName) {
      return baseName;
    }
  } catch {
    // ENSIP-19 resolution can fail for many transient reasons (state proof
    // unavailable, gateway timeout). Fall through to standard ENS.
  }
  try {
    const ensName = await client.getEnsName({ address: addr });
    return ensName ?? null;
  } catch {
    return null;
  }
}

async function resolveAll(
  addresses: readonly Address[],
): Promise<Record<Address, string | null>> {
  const client = getMainnetClient();
  if (!client) {
    return Object.fromEntries(addresses.map((a) => [a, null])) as Record<
      Address,
      string | null
    >;
  }
  const names = await withConcurrency(addresses, CONCURRENCY, (addr) =>
    resolveOne(client, addr),
  );
  const out: Record<Address, string | null> = {};
  addresses.forEach((addr, i) => {
    out[addr] = names[i];
  });
  return out;
}

export function useBasenames(addresses: readonly Address[]) {
  const sorted = [...new Set(addresses)].sort();
  return useQuery({
    queryKey: ['admin', 'basenames', sorted.join(',')],
    queryFn: () => resolveAll(sorted),
    enabled: sorted.length > 0 && Boolean(ETH_MAINNET_RPC_URL),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function isBasenamesEnabled(): boolean {
  return Boolean(ETH_MAINNET_RPC_URL);
}
