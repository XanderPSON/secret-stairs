'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import { holders } from '../../lib/admin/derive';
import { formatPT } from '../../lib/admin/format';
import type { Address, MintEvent } from '../../lib/admin/types';
import { AddressLabel } from './AddressLabel';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

const PAGE_SIZE = 50;

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function HoldersTable({
  chain,
  events,
  basenames = {},
}: {
  chain: AdminChain;
  events: MintEvent[];
  basenames?: Record<Address, string | null>;
}) {
  const all = useMemo(() => holders(events), [events]);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  // Clamp page if a refetch shrinks the dataset out from under us.
  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(0);
    }
  }, [page, totalPages]);

  const start = page * PAGE_SIZE;
  const slice = all.slice(start, start + PAGE_SIZE);

  const onExport = () => {
    const rows: string[][] = [
      ['token_id', 'address', 'basename', 'minted_at_unix', 'minted_at_pt'],
      ...all.map((h) => [
        h.tokenId.toString(),
        h.address,
        basenames[h.address] ?? '',
        h.mintedAt.toString(),
        formatPT(h.mintedAt),
      ]),
    ];
    downloadCsv(`secret-stairs-${chain.slug}-holders.csv`, rows);
  };

  return (
    <WidgetCard
      title={`All Minters (${all.length})`}
      action={
        all.length > 0 ? (
          <button
            type="button"
            onClick={onExport}
            className="rounded border border-white/20 px-2 py-1 text-white/70 text-xs hover:bg-white/10"
          >
            ↓ CSV
          </button>
        ) : null
      }
    >
      {all.length === 0 ? (
        <WidgetEmpty>No minters yet.</WidgetEmpty>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 text-xs uppercase tracking-widest">
                <th className="py-2">#</th>
                <th>Address</th>
                <th className="text-right">Minted</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((h) => (
                <tr
                  key={`${h.tokenId.toString()}-${h.address}`}
                  className="border-white/5 border-t hover:bg-white/5"
                >
                  <td className="py-2 font-mono text-white/80 tabular-nums">
                    {h.tokenId.toString()}
                  </td>
                  <td>
                    <a
                      href={chain.explorerAddressUrl(h.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-white/70 hover:text-white"
                    >
                      <AddressLabel
                        address={h.address}
                        basename={basenames[h.address]}
                      />
                    </a>
                  </td>
                  <td className="text-right font-mono text-white/50 text-xs">
                    {formatPT(h.mintedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 ? (
            <nav className="mt-3 flex items-center justify-between text-white/60 text-xs">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border border-white/20 px-2 py-1 disabled:opacity-30"
              >
                ‹ Prev
              </button>
              <span>
                Page {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded border border-white/20 px-2 py-1 disabled:opacity-30"
              >
                Next ›
              </button>
            </nav>
          ) : null}
        </>
      )}
    </WidgetCard>
  );
}
