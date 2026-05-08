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
  title: {
    default: 'Secret Stairs',
    template: '%s | Secret Stairs',
  },
  description:
    'Find the code, mint your pass. A gasless NFT for office visitors.',
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
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
