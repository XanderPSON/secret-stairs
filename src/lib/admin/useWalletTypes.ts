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
