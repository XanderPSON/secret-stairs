'use client';

import { useRouter } from 'next/navigation';
import { ADMIN_CHAINS } from '../../lib/admin/chains';

export function ChainSwitcher({ currentSlug }: { currentSlug: string }) {
  const router = useRouter();
  return (
    <select
      value={currentSlug}
      onChange={(e) => router.push(`/admin?chain=${e.target.value}`)}
      className="rounded border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0052FF]"
    >
      {Object.values(ADMIN_CHAINS).map((c) => (
        <option key={c.slug} value={c.slug} className="bg-[#0A1628]">
          {c.name}
          {c.contractAddress === null ? ' (coming soon)' : ''}
        </option>
      ))}
    </select>
  );
}
