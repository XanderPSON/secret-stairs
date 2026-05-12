'use client';

import { useMemo } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import type { Address, MintEvent, WalletKind } from '../../lib/admin/types';
import { useWalletTypes } from '../../lib/admin/useWalletTypes';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';
import { WidgetError } from './WidgetError';
import { WidgetSkeleton } from './WidgetSkeleton';

export function WalletTypeBreakdown({
  chain,
  events,
}: { chain: AdminChain; events: MintEvent[] }) {
  const addresses = useMemo<Address[]>(
    () => [...new Set(events.map((e) => e.to))],
    [events],
  );
  const { data, isLoading, error, refetch } = useWalletTypes(chain, addresses);

  if (events.length === 0) {
    return (
      <WidgetCard title="Wallet Types">
        <WidgetEmpty>No mints yet.</WidgetEmpty>
      </WidgetCard>
    );
  }
  if (isLoading || !data) {
    return (
      <WidgetCard title="Wallet Types">
        <WidgetSkeleton rows={2} />
      </WidgetCard>
    );
  }
  if (error) {
    return (
      <WidgetCard title="Wallet Types">
        <WidgetError message={error.message} onRetry={() => refetch()} />
      </WidgetCard>
    );
  }

  const counts: Record<WalletKind, number> = { smart: 0, eoa: 0 };
  for (const k of Object.values(data)) {
    counts[k] += 1;
  }
  const total = counts.smart + counts.eoa;
  const smartPct = total === 0 ? 0 : Math.round((counts.smart / total) * 100);
  const eoaPct = 100 - smartPct;

  return (
    <WidgetCard title="Wallet Types">
      <div className="space-y-3">
        <div className="h-4 w-full overflow-hidden rounded bg-white/10">
          <div className="flex h-full">
            <div
              className="bg-[#0052FF]"
              style={{ width: `${smartPct}%` }}
              title={`Smart wallets: ${counts.smart}`}
            />
            <div
              className="bg-white/40"
              style={{ width: `${eoaPct}%` }}
              title={`EOAs: ${counts.eoa}`}
            />
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/80">
            <span className="inline-block h-2 w-2 rounded-sm bg-[#0052FF]" />{' '}
            Smart Wallet — {counts.smart} ({smartPct}%)
          </span>
          <span className="text-white/60">
            <span className="inline-block h-2 w-2 rounded-sm bg-white/40" /> EOA
            — {counts.eoa} ({eoaPct}%)
          </span>
        </div>
        <p className="text-white/40 text-xs">
          Detected via on-chain bytecode check (smart wallets are contracts).
        </p>
      </div>
    </WidgetCard>
  );
}
