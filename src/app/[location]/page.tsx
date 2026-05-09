import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LOCATIONS, isLocationSlug } from '../../lib/locations';
import { LocationFlow } from './LocationFlow';

export const dynamicParams = true;

export function generateStaticParams() {
  return Object.keys(LOCATIONS).map((slug) => ({ location: slug }));
}

export function generateMetadata({
  params,
}: {
  params: { location: string };
}): Metadata {
  if (!isLocationSlug(params.location)) {
    return { title: 'Not found' };
  }
  const location = LOCATIONS[params.location];
  return {
    title: location.displayName,
    description: `Find the code in ${location.displayName} and mint your ${location.passName}. A gasless NFT for office visitors.`,
    openGraph: {
      title: `Secret Phrase | ${location.displayName}`,
      description: `Find the code, mint your ${location.passName}.`,
    },
  };
}

export default function LocationPage({
  params,
}: {
  params: { location: string };
}) {
  if (!isLocationSlug(params.location)) {
    notFound();
  }
  const location = LOCATIONS[params.location];
  return <LocationFlow location={location} />;
}
