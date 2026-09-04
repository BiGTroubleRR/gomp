// Admin-only writes to the "Configure this PC" catalog (`prebuilt_pcs`) — read publicly by the
// homepage hero, Featured Builds grid, /shop, and the /build?prebuilt=<id> carry-over.
//
// Reads stay public (anyone can SELECT — none of those pages have a login wall). Writes do not:
// this route is the only path that can INSERT/UPDATE/DELETE a row, and it uses the service-role
// client (bypasses RLS) only after proving the caller is an admin via Clerk. See
// supabase/schema.sql — the table has no write policy for the anon key.
import { NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/admin-auth';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { rowToBuild, buildToRow, type PrebuiltUpdate } from '@/lib/supabase/prebuilt-mapping';
import type { Build } from '@/lib/component-db-seed';

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
    build?: Build;
    sortOrder?: number;
  } | null;
  if (!body?.build) return NextResponse.json({ error: 'Expected "build".' }, { status: 400 });

  const { supabase, error: clientError } = adminClientOrError();
  if (clientError) return clientError;

  const { data, error } = await supabase!
    .from('prebuilt_pcs')
    .insert(buildToRow(body.build, body.sortOrder ?? 0))
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed.' }, { status: 500 });
  return NextResponse.json({ build: rowToBuild(data) });
}

export async function PATCH(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    build?: Build;
  } | null;
  if (!body?.id || !body.build) return NextResponse.json({ error: 'Expected "id" and "build".' }, { status: 400 });

  const { supabase, error: clientError } = adminClientOrError();
  if (clientError) return clientError;

  const patch: PrebuiltUpdate = buildToRow(body.build, 0);
  delete (patch as { sort_order?: number }).sort_order; // never touch ordering on a content edit

  const { data, error } = await supabase!.from('prebuilt_pcs').update(patch).eq('id', body.id).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Update failed.' }, { status: 500 });
  return NextResponse.json({ build: rowToBuild(data) });
}

export async function DELETE(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: 'Expected "id".' }, { status: 400 });

  const { supabase, error: clientError } = adminClientOrError();
  if (clientError) return clientError;

  const { error } = await supabase!.from('prebuilt_pcs').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
