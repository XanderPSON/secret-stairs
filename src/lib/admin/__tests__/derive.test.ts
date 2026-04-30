import { describe, expect, it } from 'vitest';
import {
  groupByDay,
  groupByHourPT,
  holders,
  recentFeed,
  totals,
} from '../derive';
import type { MintEvent } from '../types';

const A = '0x0000000000000000000000000000000000000001' as const;
const B = '0x0000000000000000000000000000000000000002' as const;
const C = '0x0000000000000000000000000000000000000003' as const;

// PT timezone: 2026-04-29 10:00 PT = 2026-04-29 17:00 UTC
const event = (tokenId: bigint, to: MintEvent['to'], isoUtc: string): MintEvent => ({
  tokenId,
  to,
  blockNumber: tokenId,
  txHash: `0x${tokenId.toString(16).padStart(64, '0')}` as `0x${string}`,
  timestamp: Math.floor(new Date(isoUtc).getTime() / 1000),
});

describe('totals', () => {
  it('counts total, today, week, unique', () => {
    const now = new Date('2026-04-29T20:00:00Z'); // 1pm PT
    const events: MintEvent[] = [
      event(0n, A, '2026-04-29T19:00:00Z'), // today PT (12pm)
      event(1n, B, '2026-04-28T19:00:00Z'), // yesterday PT
      event(2n, A, '2026-04-15T19:00:00Z'), // >7d ago
    ];
    const t = totals(events, now.getTime() / 1000);
    expect(t.total).toBe(3);
    expect(t.today).toBe(1);
    expect(t.thisWeek).toBe(2); // today + yesterday within rolling 7d
    expect(t.uniqueMinters).toBe(2);
  });

  it('returns zeros for empty', () => {
    expect(totals([], Date.now() / 1000)).toEqual({
      total: 0,
      today: 0,
      thisWeek: 0,
      uniqueMinters: 0,
    });
  });
});

describe('groupByDay', () => {
  it('groups by PT day with cumulative', () => {
    const events: MintEvent[] = [
      event(0n, A, '2026-04-27T19:00:00Z'), // 12pm PT 4/27
      event(1n, B, '2026-04-28T19:00:00Z'),
      event(2n, C, '2026-04-28T20:00:00Z'),
    ];
    const result = groupByDay(events);
    expect(result).toEqual([
      { date: '2026-04-27', count: 1, cumulative: 1 },
      { date: '2026-04-28', count: 2, cumulative: 3 },
    ]);
  });
});

describe('groupByHourPT', () => {
  it('groups by day-of-week and hour in PT', () => {
    // 2026-04-29 is a Wednesday. 19:00 UTC = 12:00 PT
    const events: MintEvent[] = [
      event(0n, A, '2026-04-29T19:00:00Z'),
    ];
    const grid = groupByHourPT(events);
    // Wed = 3 (Sun=0)
    const cell = grid.find((c) => c.dow === 3 && c.hour === 12);
    expect(cell?.count).toBe(1);
    expect(grid.length).toBe(7 * 24);
  });
});

describe('holders', () => {
  it('returns minters sorted by tokenId desc', () => {
    const events: MintEvent[] = [
      event(0n, A, '2026-04-27T19:00:00Z'),
      event(1n, B, '2026-04-28T19:00:00Z'),
    ];
    const h = holders(events);
    expect(h[0].tokenId).toBe(1n);
    expect(h[0].address).toBe(B);
    expect(h[1].tokenId).toBe(0n);
  });
});

describe('recentFeed', () => {
  it('returns most recent first, capped at limit', () => {
    const events: MintEvent[] = [
      event(0n, A, '2026-04-27T19:00:00Z'),
      event(1n, B, '2026-04-28T19:00:00Z'),
      event(2n, C, '2026-04-29T19:00:00Z'),
    ];
    const feed = recentFeed(events, 2);
    expect(feed.map((e) => e.tokenId)).toEqual([2n, 1n]);
  });
});
