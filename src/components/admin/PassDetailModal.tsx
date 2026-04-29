'use client';

import { useEffect } from 'react';
import type { AdminChain } from '../../lib/admin/chains';
import { formatPT, truncateAddress } from '../../lib/admin/format';
import type { MintEvent } from '../../lib/admin/types';
import { useTokenMetadata } from '../../lib/admin/useTokenMetadata';
import { WidgetSkeleton } from './WidgetSkeleton';

export function PassDetailModal({
  chain,
  mint,
  onClose,
}: {
  chain: AdminChain;
  mint: MintEvent;
  onClose: () => void;
}) {
  const { data, isLoading } = useTokenMetadata(chain, mint.tokenId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!chain.contractAddress) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          onClose();
        }
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-white/20 bg-[#0A1628] p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h3 className="font-bold font-mono text-lg text-white">
            {data?.name ?? `Pass #${mint.tokenId.toString()}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 text-xl hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-4">
          {isLoading || !data ? (
            <div className="aspect-square w-full rounded-lg bg-white/5">
              <WidgetSkeleton rows={6} />
            </div>
          ) : (
            <img
              src={data.imageDataUri}
              alt={data.name}
              className="aspect-square w-full rounded-lg"
            />
          )}
        </div>

        {data ? (
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {data.attributes.map((a) => (
              <div key={a.trait_type} className="rounded bg-white/5 p-2">
                <dt className="text-white/40 text-xs uppercase">{a.trait_type}</dt>
                <dd className="text-white">{String(a.value)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-white/50">Owner</dt>
            <dd>
              <a
                href={chain.explorerAddressUrl(mint.to)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-white hover:text-[#3380FF]"
              >
                {truncateAddress(mint.to)} ↗
              </a>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/50">Minted</dt>
            <dd className="font-mono text-white">{formatPT(mint.timestamp)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/50">Tx</dt>
            <dd>
              <a
                href={chain.explorerTxUrl(mint.txHash)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-white hover:text-[#3380FF]"
              >
                {truncateAddress(mint.txHash)} ↗
              </a>
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <a
            href={chain.explorerTokenUrl(chain.contractAddress, mint.tokenId)}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-white/20 px-2 py-1 text-white/70 hover:bg-white/10"
          >
            BaseScan ↗
          </a>
          <a
            href={chain.blockscoutTokenUrl(chain.contractAddress)}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-white/20 px-2 py-1 text-white/70 hover:bg-white/10"
          >
            Blockscout ↗
          </a>
          <a
            href={chain.thirdwebTokenUrl(chain.contractAddress, mint.tokenId)}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-white/20 px-2 py-1 text-white/70 hover:bg-white/10"
          >
            Thirdweb ↗
          </a>
        </div>
      </div>
    </div>
  );
}
