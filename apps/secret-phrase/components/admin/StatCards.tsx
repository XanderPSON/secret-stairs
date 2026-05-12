'use client';

import { useMemo } from 'react';
import { totals } from '../../lib/admin/derive';
import type { MintEvent } from '../../lib/admin/types';

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <p className="font-mono text-white/50 text-xs uppercase tracking-widest">
        {label}
      </p>
      <p className="mt-2 font-bold font-mono text-3xl text-white tabular-nums">
        {value}
      </p>
      {sub ? <p className="mt-1 text-white/40 text-xs">{sub}</p> : null}
    </div>
  );
}

export function StatCards({ events }: { events: MintEvent[] }) {
  const t = useMemo(() => totals(events), [events]);
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile label="Total" value={t.total} sub="passes minted" />
      <StatTile label="Today" value={t.today} sub="PT" />
      <StatTile label="This Week" value={t.thisWeek} sub="last 7 days" />
      <StatTile label="Unique Minters" value={t.uniqueMinters} />
    </div>
  );
}
