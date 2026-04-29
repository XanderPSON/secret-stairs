'use client';

import { notFound } from 'next/navigation';
import { ADMIN_CHAINS, getChain } from '../../../lib/admin/chains';
import { AdminHeader } from '../../../components/admin/AdminHeader';
import { HoldersTable } from '../../../components/admin/HoldersTable';
import { HourOfDayHeatmap } from '../../../components/admin/HourOfDayHeatmap';
import { MintsOverTimeChart } from '../../../components/admin/MintsOverTimeChart';
import { PassGallery } from '../../../components/admin/PassGallery';
import { RecentMintsFeed } from '../../../components/admin/RecentMintsFeed';
import { StatCards } from '../../../components/admin/StatCards';
import { WalletTypeBreakdown } from '../../../components/admin/WalletTypeBreakdown';
import { WidgetCard } from '../../../components/admin/WidgetCard';
import { WidgetEmpty } from '../../../components/admin/WidgetEmpty';
import { WidgetError } from '../../../components/admin/WidgetError';
import { WidgetSkeleton } from '../../../components/admin/WidgetSkeleton';
import { useMintEvents } from '../../../lib/admin/useMintEvents';

export default function AdminChainPage({
  params,
}: { params: { chain: string } }) {
  if (!ADMIN_CHAINS[params.chain]) {
    notFound();
  }
  const chain = getChain(params.chain);
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } =
    useMintEvents(chain);

  const events = data ?? [];

  return (
    <div className="space-y-6">
      <AdminHeader
        chain={chain}
        isFetching={isFetching}
        dataUpdatedAt={dataUpdatedAt}
        onRefresh={() => refetch()}
      />

      {chain.contractAddress === null ? (
        <WidgetCard>
          <WidgetEmpty>
            {chain.name} contract not deployed yet. Add the address in{' '}
            <code className="rounded bg-white/10 px-1 font-mono text-xs">
              src/lib/admin/chains.ts
            </code>{' '}
            to enable.
          </WidgetEmpty>
        </WidgetCard>
      ) : isLoading ? (
        <WidgetCard title="Loading">
          <WidgetSkeleton rows={4} />
        </WidgetCard>
      ) : error ? (
        <WidgetCard title="Error">
          <WidgetError message={error.message} onRetry={() => refetch()} />
        </WidgetCard>
      ) : (
        <>
          <StatCards events={events} />
          <MintsOverTimeChart events={events} />
          <div className="grid gap-6 lg:grid-cols-2">
            <HourOfDayHeatmap events={events} />
            <WalletTypeBreakdown chain={chain} events={events} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <RecentMintsFeed chain={chain} events={events} />
            <HoldersTable chain={chain} events={events} />
          </div>
          <PassGallery chain={chain} events={events} />
        </>
      )}
    </div>
  );
}
