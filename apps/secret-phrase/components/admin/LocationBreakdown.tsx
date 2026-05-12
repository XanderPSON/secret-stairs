'use client';

import { useMemo } from 'react';
import type { MintEvent } from '../../lib/admin/types';
import { LOCATIONS, type LocationSlug } from '../../lib/locations';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

export function LocationBreakdown({ events }: { events: MintEvent[] }) {
  const counts = useMemo(() => {
    const m = new Map<LocationSlug, number>();
    for (const e of events) {
      if (e.location) {
        m.set(e.location, (m.get(e.location) ?? 0) + 1);
      }
    }
    return m;
  }, [events]);

  const total = useMemo(
    () => [...counts.values()].reduce((a, b) => a + b, 0),
    [counts],
  );

  const rows = useMemo(() => {
    return Object.values(LOCATIONS).map((loc) => ({
      slug: loc.slug,
      name: loc.displayName,
      cityShort: loc.cityShort,
      count: counts.get(loc.slug) ?? 0,
      pct: total > 0 ? ((counts.get(loc.slug) ?? 0) / total) * 100 : 0,
    }));
  }, [counts, total]);

  return (
    <WidgetCard title={`By Location (${total})`}>
      {total === 0 ? (
        <WidgetEmpty>No mints recorded yet.</WidgetEmpty>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.slug} className="flex items-center gap-3">
              <span className="w-12 font-mono text-white/60 text-xs uppercase tracking-widest">
                {row.cityShort}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-white/5">
                <div
                  className="absolute inset-y-0 left-0 bg-[#0052FF]/70"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="w-16 text-right font-mono text-sm text-white tabular-nums">
                {row.count}
              </span>
              <span className="w-12 text-right font-mono text-white/40 text-xs tabular-nums">
                {row.pct.toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
