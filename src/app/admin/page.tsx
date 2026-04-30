'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { HoldersTable } from '../../components/admin/HoldersTable';
import { HourOfDayHeatmap } from '../../components/admin/HourOfDayHeatmap';
import { MintsOverTimeChart } from '../../components/admin/MintsOverTimeChart';
import { PassGallery } from '../../components/admin/PassGallery';
import { RecentMintsFeed } from '../../components/admin/RecentMintsFeed';
import { StatCards } from '../../components/admin/StatCards';
import { WalletTypeBreakdown } from '../../components/admin/WalletTypeBreakdown';
import { WidgetCard } from '../../components/admin/WidgetCard';
import { WidgetEmpty } from '../../components/admin/WidgetEmpty';
import { WidgetError } from '../../components/admin/WidgetError';
import { WidgetSkeleton } from '../../components/admin/WidgetSkeleton';
import {
  ADMIN_CHAINS,
  DEFAULT_CHAIN_SLUG,
  getChain,
} from '../../lib/admin/chains';
import { useBasenames } from '../../lib/admin/useBasenames';
import { useMintEvents } from '../../lib/admin/useMintEvents';

function AdminPageBody() {
  const searchParams = useSearchParams();
  const requestedSlug = searchParams.get('chain') ?? DEFAULT_CHAIN_SLUG;
  // Unknown / malformed slugs silently fall back to the default chain rather
  // than 404-ing — query params are user-editable and we'd rather show
  // something useful than punish a typo.
  const slug = ADMIN_CHAINS[requestedSlug] ? requestedSlug : DEFAULT_CHAIN_SLUG;
  const chain = getChain(slug);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } =
    useMintEvents(chain);

  const events = data ?? [];
  const minterAddresses = useMemo(
    () => [...new Set(events.map((e) => e.to))],
    [events],
  );
  const { data: basenamesData } = useBasenames(minterAddresses);
  const basenames = basenamesData ?? {};

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
            <RecentMintsFeed
              chain={chain}
              events={events}
              basenames={basenames}
            />
            <HoldersTable
              chain={chain}
              events={events}
              basenames={basenames}
            />
          </div>
          <PassGallery chain={chain} events={events} basenames={basenames} />
        </>
      )}
    </div>
  );
}

export default function AdminPage() {
  // useSearchParams requires a Suspense boundary in App Router.
  return (
    <Suspense fallback={null}>
      <AdminPageBody />
    </Suspense>
  );
}
