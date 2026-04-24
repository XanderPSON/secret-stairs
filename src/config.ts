export const NEXT_PUBLIC_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://secret-stairs.vercel.app';

export const PAYMASTER_SERVICE_URL =
  process.env.NEXT_PUBLIC_PAYMASTER_URL ?? '';

export const WELCOME_NFT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ??
  '0x0000000000000000000000000000000000000000';
