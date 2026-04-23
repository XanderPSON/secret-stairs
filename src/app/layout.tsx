import type { Metadata } from 'next';
import { NEXT_PUBLIC_URL } from '../config';
import './global.css';
import dynamic from 'next/dynamic';

const Providers = dynamic(
  () => import('../components/Providers').then((mod) => mod.Providers),
  { ssr: false },
);

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata: Metadata = {
  title: 'Secret Stairs | Coinbase HQ Welcome Pass',
  description: 'Find the code, mint your pass. A gasless NFT for Coinbase office visitors.',
  openGraph: {
    title: 'Secret Stairs',
    description: 'Find the code, mint your pass.',
    images: [`${NEXT_PUBLIC_URL}/og.png`],
  },
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex items-center justify-center min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
