// Admin-only writes to the single-row `store_settings` table.
//
// Reads stay public (anyone can SELECT — every public page needs the current VAT rate to price
// things correctly). Writes do not: this route is the only path that can UPDATE the row, and it
// uses the service-role client (bypasses RLS) only after proving the caller is an admin via
// Clerk. See supabase/schema.sql — the table has no write policy for anon/authenticated.
import { NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/admin-auth';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';

export async function PUT(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
  if (!body?.data) return NextResponse.json({ error: 'Expected "data".' }, { status: 400 });

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    throw e;
  }

  const { error } = await supabase.from('store_settings').update({ data: body.data }).eq('id', true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
