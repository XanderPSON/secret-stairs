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
