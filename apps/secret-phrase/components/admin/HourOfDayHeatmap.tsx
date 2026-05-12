'use client';

import { useMemo } from 'react';
import { groupByHourPT } from '../../lib/admin/derive';
import type { MintEvent } from '../../lib/admin/types';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HourOfDayHeatmap({ events }: { events: MintEvent[] }) {
  const grid = useMemo(() => groupByHourPT(events), [events]);
  const max = useMemo(
    () => grid.reduce((m, c) => Math.max(m, c.count), 0),
    [grid],
  );

  return (
    <WidgetCard title="Hour of Day (PT)">
      {events.length === 0 ? (
        <WidgetEmpty>No mints yet.</WidgetEmpty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[10px]">
            <thead>
              <tr>
                <th className="px-1 text-left text-white/40">·</th>
                {Array.from({ length: 24 }).map((_, h) => (
                  <th
                    // biome-ignore lint/suspicious/noArrayIndexKey: hour index is the key
                    key={h}
                    className="px-0.5 text-center text-white/40"
                  >
                    {h % 6 === 0 ? h : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((label, dow) => (
                <tr key={label}>
                  <td className="px-1 text-white/40">{label}</td>
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const cell = grid.find(
                      (g) => g.dow === dow && g.hour === hour,
                    );
                    const intensity = max > 0 ? (cell?.count ?? 0) / max : 0;
                    return (
                      <td
                        // biome-ignore lint/suspicious/noArrayIndexKey: hour index is the key
                        key={hour}
                        title={`${label} ${hour}:00 — ${cell?.count ?? 0} mints`}
                        className="h-5 w-5 border border-[#0A1628]"
                        style={{
                          backgroundColor: `rgba(0, 82, 255, ${0.08 + intensity * 0.85})`,
                        }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}
