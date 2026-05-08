import { notFound } from 'next/navigation';
import { LOCATIONS, isLocationSlug } from '../../lib/locations';
import { LocationFlow } from './LocationFlow';

export const dynamicParams = true;

export function generateStaticParams() {
  return Object.keys(LOCATIONS).map((slug) => ({ location: slug }));
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
