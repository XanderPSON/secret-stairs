'use client';

import { useMemo } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import { recentFeed } from '../../lib/admin/derive';
import { timeAgo, truncateAddress } from '../../lib/admin/format';
import type { MintEvent } from '../../lib/admin/types';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

export function RecentMintsFeed({
  chain,
  events,
}: { chain: AdminChain; events: MintEvent[] }) {
  const feed = useMemo(() => recentFeed(events, 20), [events]);

  return (
    <WidgetCard title="Recent Mints">
      {feed.length === 0 ? (
        <WidgetEmpty>No mints yet.</WidgetEmpty>
      ) : (
        <ul className="divide-y divide-white/5">
          {feed.map((e) => (
            <li
              key={e.txHash}
              className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-white/5"
            >
              <span className="font-mono text-white/80 tabular-nums">
                #{e.tokenId.toString()}
              </span>
              <a
                href={chain.explorerAddressUrl(e.to)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-white/60 hover:text-white"
                title={e.to}
              >
                {truncateAddress(e.to)}
              </a>
              <span className="text-white/40 text-xs">{timeAgo(e.timestamp)}</span>
              <a
                href={chain.explorerTxUrl(e.txHash)}
                target="_blank"
                rel="noreferrer"
                className="text-[#3380FF] hover:text-white"
                aria-label="View transaction"
              >
                ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
