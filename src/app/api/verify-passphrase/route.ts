import { NextRequest, NextResponse } from 'next/server';

const SECRET_WORDS = (process.env.SECRET_OFFICE_PHRASE ?? '')
  .toLowerCase()
  .split(/\s+/)
  .filter(Boolean);

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (typeof body.word === 'string' && typeof body.index === 'number') {
    const word = body.word.trim().toLowerCase();
    const index = body.index;

    if (index < 0 || index >= SECRET_WORDS.length) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: word === SECRET_WORDS[index] });
  }

  if (typeof body.passphrase === 'string') {
    const input = body.passphrase.trim().toLowerCase();
    const secret = SECRET_WORDS.join(' ');
    return NextResponse.json({ valid: input === secret });
  }

  return NextResponse.json({ valid: false });
}
