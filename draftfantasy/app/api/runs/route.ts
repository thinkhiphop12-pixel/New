import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Runs are written/read at request time — never statically cached.
export const dynamic = 'force-dynamic';

/** GET /api/runs?anonymousId=... → list of runs for that player, newest first. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const anonymousId = searchParams.get('anonymousId');
  if (!anonymousId) {
    return NextResponse.json({ error: 'Missing anonymousId' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .eq('anonymous_id', anonymousId)
    .order('played_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/runs → save a completed run, returns { replayCode, run }. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { shareCode, anonymousId, ...runData } = body as {
    shareCode?: string;
    anonymousId?: string;
    [key: string]: unknown;
  };

  if (!shareCode || !anonymousId) {
    return NextResponse.json({ error: 'Missing shareCode or anonymousId' }, { status: 400 });
  }

  const replayCode = crypto.randomUUID();
  const supabase = createClient();
  const { data, error } = await supabase
    .from('runs')
    .insert({
      share_code: shareCode,
      anonymous_id: anonymousId,
      replay_code: replayCode,
      ...runData,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ replayCode, run: data });
}
