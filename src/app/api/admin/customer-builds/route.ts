// Admin-only writes to "Zákaznícke GOMPy" (`customer_builds`) — the public showcase of
// already-completed customer builds at /customer-builds.
//
// Reads stay public (anyone can SELECT — the showcase has no login wall). Writes do
// not: this route is the only path that can INSERT/UPDATE/DELETE a row, and it uses
// the service-role client (bypasses RLS) only after proving the caller is an admin via
// Clerk. See supabase/schema.sql — the table has no write policy for the anon key.
import { NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/admin-auth';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { rowToCustomerBuild, customerBuildToRow, type CustomerBuild, type CustomerBuildUpdate } from '@/lib/supabase/customer-build-mapping';

function adminClientOrError() {
  try {
    return { supabase: createAdminClient() };
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return { error: NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 }) };
    }
    throw e;
  }
}

export async function POST(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    build?: CustomerBuild;
    sortOrder?: number;
  } | null;
  if (!body?.build) return NextResponse.json({ error: 'Expected "build".' }, { status: 400 });

  const { supabase, error: clientError } = adminClientOrError();
  if (clientError) return clientError;

  const { data, error } = await supabase!
    .from('customer_builds')
    .insert(customerBuildToRow(body.build, body.sortOrder ?? 0))
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed.' }, { status: 500 });
  return NextResponse.json({ build: rowToCustomerBuild(data) });
}

export async function PATCH(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    build?: CustomerBuild;
  } | null;
  if (!body?.id || !body.build) return NextResponse.json({ error: 'Expected "id" and "build".' }, { status: 400 });

  const { supabase, error: clientError } = adminClientOrError();
  if (clientError) return clientError;

  const patch: CustomerBuildUpdate = customerBuildToRow(body.build, 0);
  delete (patch as { sort_order?: number }).sort_order; // never touch ordering on a content edit

  const { data, error } = await supabase!.from('customer_builds').update(patch).eq('id', body.id).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Update failed.' }, { status: 500 });
  return NextResponse.json({ build: rowToCustomerBuild(data) });
}

export async function DELETE(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: 'Expected "id".' }, { status: 400 });

  const { supabase, error: clientError } = adminClientOrError();
  if (clientError) return clientError;

  const { error } = await supabase!.from('customer_builds').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
