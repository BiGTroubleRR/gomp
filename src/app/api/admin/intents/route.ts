// Admin-only access to checkout order requests (`checkout_intents`).
//
// This route is the ONLY way that table's contents can be read, by design: the
// public anon key has no select policy on it because it holds customer PII, so
// there is no browser-side path to this data at all. Every request here proves
// the caller is an admin (via Clerk) before touching the service-role client.
//
// ---------------------------------------------------------------------------
// WIRING THESE TO REAL ORDERS LATER
// ---------------------------------------------------------------------------
// The `status` field is the intended hand-off point:
//
//   new        — just submitted, nobody has looked at it
//   contacted  — a human has reached out to confirm availability/price
//   converted  — became a real, paid order
//   archived   — dead lead, or duplicate
//
// When payments go live, add a POST /api/admin/intents/[id]/convert that, in one
// transaction: creates the `orders` row (+ `order_items` from `build_items`),
// records the payment provider's reference against it, and flips this intent to
// 'converted' with a link to the new order id. Nothing here needs to change to
// support that — the intent row already carries the full build snapshot and the
// frozen price breakdown needed to create a real order from it.
import { NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/admin-auth';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';

const VALID_STATUSES = ['new', 'contacted', 'converted', 'archived'] as const;
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
    .from('checkout_intents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ intents: data ?? [] });
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

  const { error } = await supabase.from('checkout_intents').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
