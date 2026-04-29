'use client';

import { useMemo, useState } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import type { MintEvent } from '../../lib/admin/types';
import { useTokenMetadata } from '../../lib/admin/useTokenMetadata';
import { PassDetailModal } from './PassDetailModal';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

type SortKey = 'newest' | 'oldest' | 'token-asc';

function GalleryTile({
  chain,
  mint,
  onOpen,
}: { chain: AdminChain; mint: MintEvent; onOpen: () => void }) {
  const { data, isLoading } = useTokenMetadata(chain, mint.tokenId);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex aspect-square flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5 hover:border-[#0052FF]/60"
    >
      <div className="flex flex-1 items-center justify-center bg-black/20">
        {isLoading || !data ? (
          <span className="font-mono text-white/30 text-xs">loading…</span>
        ) : (
          // biome-ignore lint/a11y/useAltText: tile is part of a button with token id label below
          <img
            src={data.imageDataUri}
            alt={data.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <span className="bg-black/40 py-1 text-center font-mono text-[10px] text-white/70">
        #{mint.tokenId.toString()}
      </span>
    </button>
  );
}

export function PassGallery({
  chain,
  events,
}: { chain: AdminChain; events: MintEvent[] }) {
  const [sort, setSort] = useState<SortKey>('newest');
  const [openMint, setOpenMint] = useState<MintEvent | null>(null);

  const sorted = useMemo(() => {
    const arr = [...events];
    switch (sort) {
      case 'newest':
        arr.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        arr.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'token-asc':
        arr.sort((a, b) => (a.tokenId < b.tokenId ? -1 : 1));
        break;
    }
    return arr;
  }, [events, sort]);

  return (
    <>
      <WidgetCard
        title={`Gallery (${events.length})`}
        action={
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded border border-white/20 bg-white/5 px-2 py-1 text-white text-xs"
          >
            <option value="newest" className="bg-[#0A1628]">Newest</option>
            <option value="oldest" className="bg-[#0A1628]">Oldest</option>
            <option value="token-asc" className="bg-[#0A1628]">Token ID ↑</option>
          </select>
        }
      >
        {sorted.length === 0 ? (
          <WidgetEmpty>No passes yet.</WidgetEmpty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {sorted.map((m) => (
              <GalleryTile
                key={m.txHash}
                chain={chain}
                mint={m}
                onOpen={() => setOpenMint(m)}
              />
            ))}
          </div>
        )}
      </WidgetCard>
      {openMint ? (
        <PassDetailModal
          chain={chain}
          mint={openMint}
          onClose={() => setOpenMint(null)}
        />
      ) : null}
    </>
  );
}
