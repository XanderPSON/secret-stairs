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
    deployBlock: 40598693n,
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
