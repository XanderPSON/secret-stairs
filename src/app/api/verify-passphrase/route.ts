import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { passphrase } = await req.json();
  const secret = process.env.SECRET_OFFICE_PHRASE ?? '';

  if (!secret) {
    return NextResponse.json(
      { valid: false, error: 'Server misconfigured' },
      { status: 500 },
    );
  }

  const valid =
    passphrase?.trim().toLowerCase() === secret.trim().toLowerCase();

  return NextResponse.json({ valid });
}
