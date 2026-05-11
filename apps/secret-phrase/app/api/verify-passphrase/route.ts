import { type NextRequest, NextResponse } from 'next/server';
import {
  getLocation,
  isLocationSlug,
  validatePassphrase,
  validateSlot,
} from '../../../lib/locations';

const LEGACY_SECRET_WORDS = (process.env.SECRET_OFFICE_PHRASE ?? '')
  .toLowerCase()
  .split(/\s+/)
  .filter(Boolean);

function legacyValidateSlot(word: string, index: number): boolean {
  if (index < 0 || index >= LEGACY_SECRET_WORDS.length) {
    return false;
  }
  return word.trim().toLowerCase() === LEGACY_SECRET_WORDS[index];
}

function legacyValidatePassphrase(passphrase: string): boolean {
  return passphrase.trim().toLowerCase() === LEGACY_SECRET_WORDS.join(' ');
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ valid: false });
  }

  const b = body as Record<string, unknown>;
  const slug = typeof b.location === 'string' ? b.location : undefined;

  if (slug !== undefined && !isLocationSlug(slug)) {
    return NextResponse.json({ valid: false });
  }
  const location = slug !== undefined ? getLocation(slug) : null;

  if (typeof b.word === 'string' && typeof b.index === 'number') {
    const valid = location
      ? validateSlot(location, b.index, b.word)
      : legacyValidateSlot(b.word, b.index);
    return NextResponse.json({ valid });
  }

  if (typeof b.passphrase === 'string') {
    const valid = location
      ? validatePassphrase(location, b.passphrase)
      : legacyValidatePassphrase(b.passphrase);
    return NextResponse.json({ valid });
  }

  return NextResponse.json({ valid: false });
}
