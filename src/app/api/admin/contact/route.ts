// Admin-only access to Contact-form submissions (`contact_messages`).
//
// Mirrors src/app/api/admin/intents/route.ts: the public anon key has no
// select policy on this table, so there is no browser-side path to it at
// all. Every request here proves the caller is an admin (via Clerk) before
// touching the service-role client.
import { NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/admin-auth';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';

const VALID_STATUSES = ['new', 'read', 'archived'] as const;
type Status = (typeof VALID_STATUSES)[number];

function isStatus(v: unknown): v is Status {
  return typeof v === 'string' && (VALID_STATUSES as readonly string[]).includes(v);
}

export async function GET() {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    throw e;
  }

  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function PATCH(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const { id, status } = (body ?? {}) as { id?: unknown; status?: unknown };
  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'Missing "id".' }, { status: 400 });
  if (!isStatus(status)) {
    return NextResponse.json({ error: `"status" must be one of: ${VALID_STATUSES.join(', ')}.` }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    throw e;
  }

  const { error } = await supabase.from('contact_messages').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
