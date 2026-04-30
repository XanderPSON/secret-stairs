export const NEXT_PUBLIC_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://secret-stairs.vercel.app';

export const WELCOME_NFT_ADDRESS = ((
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  '0x0000000000000000000000000000000000000000'
).trim()) as `0x${string}`;
