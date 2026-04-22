export const NEXT_PUBLIC_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://secret-stairs.vercel.app';

// CDP Paymaster proxy URL — in production, proxy this through your backend
export const PAYMASTER_SERVICE_URL =
  process.env.NEXT_PUBLIC_PAYMASTER_URL ?? '';

// Contract address for WelcomeNFT on Base Sepolia
export const WELCOME_NFT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ??
  '0x0000000000000000000000000000000000000000';
