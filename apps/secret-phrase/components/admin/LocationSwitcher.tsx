'use client';

import { useRouter } from 'next/navigation';
import { LOCATIONS } from '../../lib/locations';

export function LocationSwitcher({ currentValue }: { currentValue: string }) {
  const router = useRouter();
  return (
    <select
      value={currentValue}
      onChange={(e) => router.push(`/admin?location=${e.target.value}`)}
      className="rounded border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]"
    >
      <option value="all" className="bg-[#0A1628]">
        All locations
      </option>
      {Object.values(LOCATIONS).map((loc) => (
        <option key={loc.slug} value={loc.slug} className="bg-[#0A1628]">
          {loc.displayName}
          {loc.contractAddress === null ? ' (coming soon)' : ''}
        </option>
      ))}
    </select>
  );
}
