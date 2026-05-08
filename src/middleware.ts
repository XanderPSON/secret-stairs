import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isLocationSlug } from './lib/locations';

// Reserved top-level paths that must NOT be treated as location slugs.
// Anything else at the root that isn't a known location gets a hard 404.
const RESERVED_ROOTS = new Set([
  'admin',
  'api',
  '_next',
  'favicon.ico',
  'og.png',
  'robots.txt',
  'sitemap.xml',
]);

export function middleware(req: NextRequest) {
  const segments = req.nextUrl.pathname.split('/').filter(Boolean);
  if (segments.length !== 1) {
    return NextResponse.next();
  }
  const first = segments[0];
  if (RESERVED_ROOTS.has(first)) {
    return NextResponse.next();
  }
  if (isLocationSlug(first)) {
    return NextResponse.next();
  }
  return new NextResponse(null, { status: 404 });
}

export const config = {
  // Match all paths except Next internals and static files. Single-segment
  // paths get the location-slug check above; everything else passes through.
  matcher: ['/((?!_next/|favicon.ico|og.png|robots.txt|sitemap.xml).*)'],
};
