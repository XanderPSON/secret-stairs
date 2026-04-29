'use client';

import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { groupByDay } from '../../lib/admin/derive';
import type { MintEvent } from '../../lib/admin/types';
import { WidgetCard } from './WidgetCard';
import { WidgetEmpty } from './WidgetEmpty';

export function MintsOverTimeChart({ events }: { events: MintEvent[] }) {
  const data = useMemo(() => groupByDay(events), [events]);

  return (
    <WidgetCard title="Mints Over Time">
      {data.length === 0 ? (
        <WidgetEmpty>No mints yet.</WidgetEmpty>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#ffffff80', fontSize: 11 }}
                stroke="#ffffff20"
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#ffffff80', fontSize: 11 }}
                stroke="#ffffff20"
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#ffffff60', fontSize: 11 }}
                stroke="#ffffff20"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#0A1628',
                  border: '1px solid #ffffff20',
                  borderRadius: 8,
                  color: '#fff',
                }}
                cursor={{ fill: '#0052FF20' }}
              />
              <Bar
                yAxisId="left"
                dataKey="count"
                fill="#0052FF"
                name="Daily mints"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                stroke="#3380FF"
                strokeWidth={2}
                dot={false}
                name="Cumulative"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}
