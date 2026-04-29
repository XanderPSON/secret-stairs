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
