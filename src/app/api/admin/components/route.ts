// Admin-only writes to the shared PC-component catalog (`components`).
//
// Reads stay public (anyone can SELECT — /build has no login wall and needs the
// catalog to render). Writes do not: this route is the only path that can
// INSERT/UPDATE/DELETE a row, and it uses the service-role client (bypasses RLS)
// only after proving the caller is an admin via Clerk. See supabase/schema.sql —
// the table's RLS write policy was removed to close off the anon key entirely.
import { NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/admin-auth';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { rowToComponent, componentToRow, type ComponentUpdate } from '@/lib/supabase/component-mapping';
import type { Category, Component } from '@/lib/component-db-seed';

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
    category?: Category;
    comp?: Component;
    sortOrder?: number;
  } | null;
  if (!body?.category || !body.comp) {
    return NextResponse.json({ error: 'Expected "category" and "comp".' }, { status: 400 });
  }

  const { supabase, error: clientError } = adminClientOrError();
  if (clientError) return clientError;

  const { data, error } = await supabase!
    .from('components')
    .insert(componentToRow(body.category, body.comp, body.sortOrder ?? 0))
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed.' }, { status: 500 });
  return NextResponse.json({ component: rowToComponent(data) });
}

export async function PATCH(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    category?: Category;
    comp?: Component;
  } | null;
  if (!body?.id || !body.category || !body.comp) {
    return NextResponse.json({ error: 'Expected "id", "category" and "comp".' }, { status: 400 });
  }

  const { supabase, error: clientError } = adminClientOrError();
  if (clientError) return clientError;

  const patch: ComponentUpdate = componentToRow(body.category, body.comp, 0);
  delete (patch as { sort_order?: number }).sort_order; // never touch ordering on a content edit

  const { data, error } = await supabase!.from('components').update(patch).eq('id', body.id).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Update failed.' }, { status: 500 });
  return NextResponse.json({ component: rowToComponent(data) });
}

export async function DELETE(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: 'Expected "id".' }, { status: 400 });

  const { supabase, error: clientError } = adminClientOrError();
  if (clientError) return clientError;

  const { error } = await supabase!.from('components').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
