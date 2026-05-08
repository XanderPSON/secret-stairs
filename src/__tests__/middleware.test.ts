import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from '../middleware';

function req(path: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${path}`));
}

describe('middleware — location slug guard', () => {
  it('passes through known location slugs', () => {
    for (const slug of ['/sf', '/nyc']) {
      const res = middleware(req(slug));
      expect(res.status).toBe(200);
    }
  });

  it('passes through reserved roots (admin, api)', () => {
    for (const path of ['/admin', '/api/verify-passphrase', '/api/paymaster']) {
      const res = middleware(req(path));
      expect(res.status).toBe(200);
    }
  });

  it('passes through static asset paths', () => {
    for (const path of ['/favicon.ico', '/og.png', '/robots.txt']) {
      const res = middleware(req(path));
      expect(res.status).toBe(200);
    }
  });

  it('passes through the root path /', () => {
    const res = middleware(req('/'));
    expect(res.status).toBe(200);
  });

  it('passes through deep paths (more than one segment)', () => {
    const res = middleware(req('/sf/anything/here'));
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown single-segment slugs', () => {
    for (const path of ['/lon', '/foo', '/banana', '/london', '/tokyo']) {
      const res = middleware(req(path));
      expect(res.status).toBe(404);
    }
  });

  it('rejects an unknown slug even if it looks valid', () => {
    const res = middleware(req('/sfx'));
    expect(res.status).toBe(404);
  });
});
