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
