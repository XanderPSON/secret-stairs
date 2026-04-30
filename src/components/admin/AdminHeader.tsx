'use client';

import { useEffect, useState } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import { truncateAddress } from '../../lib/admin/format';
import { ChainSwitcher } from './ChainSwitcher';

export function AdminHeader({
  chain,
  isFetching,
  dataUpdatedAt,
  onRefresh,
}: {
  chain: AdminChain;
  isFetching: boolean;
  dataUpdatedAt: number; // ms since epoch; 0 if never
  onRefresh: () => void;
}) {
  const [tick, setTick] = useState(0);
  // Re-render every second so "Xs ago" stays accurate.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ago =
    dataUpdatedAt > 0
      ? Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000))
      : null;

  return (
    <header className="flex flex-col gap-3 border-white/10 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-mono text-[#3380FF] text-xs uppercase tracking-widest">
          Secret Stairs
        </p>
        <h1 className="font-bold text-white text-xl">Admin Dashboard</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ChainSwitcher currentSlug={chain.slug} />

        {chain.contractAddress ? (
          <a
            href={chain.explorerAddressUrl(chain.contractAddress)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-white/70 hover:text-white"
            title={chain.contractAddress}
          >
            {truncateAddress(chain.contractAddress)} ↗
          </a>
        ) : (
          <span className="font-mono text-sm text-white/40">no contract</span>
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 rounded border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-50"
        >
          <span className={isFetching ? 'animate-spin' : ''}>↻</span>
          {ago === null ? 'never' : `${ago}s ago`}
          {/* tick is read just to make the dependency explicit */}
          <span className="hidden">{tick}</span>
        </button>
      </div>
    </header>
  );
}
