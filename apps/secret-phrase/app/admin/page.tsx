'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { HoldersTable } from '../../components/admin/HoldersTable';
import { HourOfDayHeatmap } from '../../components/admin/HourOfDayHeatmap';
import { LocationBreakdown } from '../../components/admin/LocationBreakdown';
import { MintsOverTimeChart } from '../../components/admin/MintsOverTimeChart';
import { PassGallery } from '../../components/admin/PassGallery';
import { RecentMintsFeed } from '../../components/admin/RecentMintsFeed';
import { StatCards } from '../../components/admin/StatCards';
import { WalletTypeBreakdown } from '../../components/admin/WalletTypeBreakdown';
import { WidgetCard } from '../../components/admin/WidgetCard';
import { WidgetEmpty } from '../../components/admin/WidgetEmpty';
import { WidgetError } from '../../components/admin/WidgetError';
import { WidgetSkeleton } from '../../components/admin/WidgetSkeleton';
import { useBasenames } from '../../lib/admin/useBasenames';
import {
  chainForLocations,
  locationsForFilter,
  useMintEventsByLocation,
} from '../../lib/admin/useMintEventsByLocation';
import { type LocationSlug, isLocationSlug } from '../../lib/locations';

type LocationFilter = LocationSlug | 'all';

function parseFilter(raw: string | null): LocationFilter {
  if (raw === 'all' || raw === null) { return 'all'; }
  return isLocationSlug(raw) ? raw : 'all';
}

function AdminPageBody() {
  const searchParams = useSearchParams();
  const filter = parseFilter(searchParams.get('location'));

  const locations = useMemo(() => locationsForFilter(filter), [filter]);
  const chain = useMemo(() => chainForLocations(locations), [locations]);

  const headerContractAddress =
    locations.length === 1 ? locations[0].contractAddress : null;

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } =
    useMintEventsByLocation(locations);

  const events = data ?? [];
  const minterAddresses = useMemo(
    () => [...new Set(events.map((e) => e.to))],
    [events],
  );
  const { data: basenamesData } = useBasenames(minterAddresses);
  const basenames = basenamesData ?? {};

  const hasAnyDeployedContract = locations.some(
    (l) => l.contractAddress !== null,
  );

  return (
    <div className="space-y-6">
      <AdminHeader
        chain={chain}
        contractAddress={headerContractAddress}
        locationFilter={filter}
        isFetching={isFetching}
        dataUpdatedAt={dataUpdatedAt}
        onRefresh={() => refetch()}
      />

      {hasAnyDeployedContract ? isLoading ? (
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
          {filter === 'all' && <LocationBreakdown events={events} />}
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
            <HoldersTable chain={chain} events={events} basenames={basenames} />
          </div>
          <PassGallery chain={chain} events={events} basenames={basenames} />
        </>
      ) : (
        <WidgetCard>
          <WidgetEmpty>
            No contracts deployed for the selected location(s) yet. Add a
            contract address in{' '}
            <code className="rounded bg-white/10 px-1 font-mono text-xs">
              src/lib/locations.ts
            </code>{' '}
            to enable.
          </WidgetEmpty>
        </WidgetCard>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageBody />
    </Suspense>
  );
}
