import type { Address, MintEvent } from './types';

const PT_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const PT_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  weekday: 'short',
  hour: 'numeric',
  hour12: false,
});

const DAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function ptDateString(unixSec: number): string {
  return PT_DATE.format(new Date(unixSec * 1000)); // YYYY-MM-DD
}

function ptDowAndHour(unixSec: number): { dow: number; hour: number } {
  const parts = PT_PARTS.formatToParts(new Date(unixSec * 1000));
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
  // Intl returns "24" for midnight in some locales; normalize.
  const hour = Number(hourStr) % 24;
  return { dow: DAY_INDEX[weekday] ?? 0, hour };
}

export function totals(
  events: readonly MintEvent[],
  nowSec: number = Date.now() / 1000,
): {
  total: number;
  today: number;
  thisWeek: number;
  uniqueMinters: number;
} {
  const today = ptDateString(nowSec);
  const oneWeekAgo = nowSec - 60 * 60 * 24 * 7;
  let todayCount = 0;
  let weekCount = 0;
  const unique = new Set<Address>();
  for (const e of events) {
    unique.add(e.to);
    if (ptDateString(e.timestamp) === today) {
      todayCount += 1;
    }
    if (e.timestamp >= oneWeekAgo) {
      weekCount += 1;
    }
  }
  return {
    total: events.length,
    today: todayCount,
    thisWeek: weekCount,
    uniqueMinters: unique.size,
  };
}

export function groupByDay(
  events: readonly MintEvent[],
): { date: string; count: number; cumulative: number }[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    const d = ptDateString(e.timestamp);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  let cum = 0;
  return sorted.map(([date, count]) => {
    cum += count;
    return { date, count, cumulative: cum };
  });
}

export function groupByHourPT(
  events: readonly MintEvent[],
): { dow: number; hour: number; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    const { dow, hour } = ptDowAndHour(e.timestamp);
    const key = `${dow}-${hour}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const grid: { dow: number; hour: number; count: number }[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      grid.push({ dow, hour, count: counts.get(`${dow}-${hour}`) ?? 0 });
    }
  }
  return grid;
}

export function holders(
  events: readonly MintEvent[],
): { address: Address; tokenId: bigint; mintedAt: number }[] {
  return [...events]
    .map((e) => ({ address: e.to, tokenId: e.tokenId, mintedAt: e.timestamp }))
    .sort((a, b) => (a.tokenId > b.tokenId ? -1 : 1));
}

export function recentFeed(
  events: readonly MintEvent[],
  limit = 20,
): MintEvent[] {
  return [...events]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}
