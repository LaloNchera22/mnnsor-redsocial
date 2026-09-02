import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { action } = await req.json();

  const limit = action === 'flag' ? 20 : 5; // 20 flags or 5 posts per minute

  if (!(await checkRateLimit(`${ip}_${action}`, limit, 60000))) {
     return NextResponse.json({ error: `Rate limit exceeded for ${action}.` }, { status: 429 });
  }

  return NextResponse.json({ ok: true });
}
