import { describe, expect, it } from 'vitest';
import { formatPT, timeAgo, truncateAddress } from '../format';

describe('truncateAddress', () => {
  it('truncates a 42-char address to first6...last4', () => {
    expect(
      truncateAddress('0x1234567890123456789012345678901234567890'),
    ).toBe('0x1234…7890');
  });

  it('returns short input unchanged', () => {
    expect(truncateAddress('0xabc')).toBe('0xabc');
  });
});

describe('timeAgo', () => {
  const now = Date.UTC(2026, 0, 15, 12, 0, 0) / 1000;

  it('returns "just now" for <30s', () => {
    expect(timeAgo(now - 5, now)).toBe('just now');
  });

  it('returns "Nm ago" for minutes', () => {
    expect(timeAgo(now - 60 * 5, now)).toBe('5m ago');
  });

  it('returns "Nh ago" for hours', () => {
    expect(timeAgo(now - 60 * 60 * 3, now)).toBe('3h ago');
  });

  it('returns "Nd ago" for days', () => {
    expect(timeAgo(now - 60 * 60 * 24 * 2, now)).toBe('2d ago');
  });
});

describe('formatPT', () => {
  it('formats a unix timestamp in America/Los_Angeles', () => {
    // 2026-01-15T20:30:00Z = 12:30 PM PST on Jan 15
    const result = formatPT(Date.UTC(2026, 0, 15, 20, 30, 0) / 1000);
    expect(result).toMatch(/Jan 15.*12:30/);
  });
});
