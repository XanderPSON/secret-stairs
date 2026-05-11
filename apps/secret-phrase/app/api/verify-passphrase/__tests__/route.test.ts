import type { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../../../../lib/locations';
import { POST } from '../route';

function makeReq(body: unknown): NextRequest {
  return new Request('http://localhost/api/verify-passphrase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

async function call(body: unknown): Promise<{ valid: boolean }> {
  const res = await POST(makeReq(body));
  return (await res.json()) as { valid: boolean };
}

describe('POST /api/verify-passphrase — per-location word check', () => {
  it('accepts the exact expected NYC word at slot 0 (MARKET)', async () => {
    const r = await call({ location: 'nyc', word: 'MARKET', index: 0 });
    expect(r.valid).toBe(true);
  });

  it('accepts a letter-swapped NYC word (ADDRESS at A-slot 1)', async () => {
    const r = await call({ location: 'nyc', word: 'ADDRESS', index: 1 });
    expect(r.valid).toBe(true);
  });

  it('rejects an A-word that is NOT in the NYC pool (APPLE at slot 1)', async () => {
    const r = await call({ location: 'nyc', word: 'APPLE', index: 1 });
    expect(r.valid).toBe(false);
  });

  it('rejects an SF-only word (CUSTODY) at any NYC slot', async () => {
    const r = await call({ location: 'nyc', word: 'CUSTODY', index: 7 });
    expect(r.valid).toBe(false);
  });

  it('accepts the exact expected SF word at slot 0 (STAKE)', async () => {
    const r = await call({ location: 'sf', word: 'STAKE', index: 0 });
    expect(r.valid).toBe(true);
  });

  it('accepts a letter-swapped SF word (ACCESS at A-slot 1)', async () => {
    const r = await call({ location: 'sf', word: 'ACCESS', index: 1 });
    expect(r.valid).toBe(true);
  });
});

describe('POST /api/verify-passphrase — full passphrase check', () => {
  it('accepts the exact ordered NYC phrase', async () => {
    const r = await call({
      location: 'nyc',
      passphrase: LOCATIONS.nyc.words.join(' '),
    });
    expect(r.valid).toBe(true);
  });

  it('rejects the SF phrase against NYC location', async () => {
    const r = await call({
      location: 'nyc',
      passphrase: LOCATIONS.sf.words.join(' '),
    });
    expect(r.valid).toBe(false);
  });
});

describe('POST /api/verify-passphrase — unknown / malformed input', () => {
  it('returns valid:false for an unknown location slug', async () => {
    const r = await call({ location: 'mars', word: 'MARKET', index: 0 });
    expect(r.valid).toBe(false);
  });

  it('returns valid:false for a request with no word and no passphrase', async () => {
    const r = await call({ location: 'nyc' });
    expect(r.valid).toBe(false);
  });

  it('returns valid:false for malformed JSON body', async () => {
    const req = new Request('http://localhost/api/verify-passphrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    }) as unknown as NextRequest;
    const res = await POST(req);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });

  it('returns valid:false for index out of range', async () => {
    const r = await call({ location: 'nyc', word: 'MARKET', index: 99 });
    expect(r.valid).toBe(false);
  });
});
