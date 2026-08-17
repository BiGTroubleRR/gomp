// Admin-only access to "Gomp Budget Builds" requests (`gbb_requests`) — same shape as
// src/app/api/admin/intents/route.ts. The anon key has no select policy on this table (it holds
// customer PII), so this route is the only read path, gated on Clerk admin status.
import { NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/admin-auth';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';

const VALID_STATUSES = ['new', 'researching', 'quoted', 'converted', 'archived'] as const;
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
    .from('gbb_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function PATCH(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: string;
    priceProposalEur?: number | string | null;
    proposalNotes?: string;
  } | null;
  if (!body?.id) return NextResponse.json({ error: 'Expected "id".' }, { status: 400 });

  const patch: { status?: Status; price_proposal_eur?: number | null; proposal_notes?: string } = {};
  if (body.status !== undefined) {
    if (!isStatus(body.status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    patch.status = body.status;
  }
  if (body.priceProposalEur !== undefined) {
    const parsed = body.priceProposalEur === null || body.priceProposalEur === '' ? null : Number(body.priceProposalEur);
    patch.price_proposal_eur = parsed != null && !isNaN(parsed) ? parsed : null;
  }
  if (body.proposalNotes !== undefined) patch.proposal_notes = body.proposalNotes;

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    throw e;
  }

  const { data, error } = await supabase.from('gbb_requests').update(patch).eq('id', body.id).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Update failed.' }, { status: 500 });
  return NextResponse.json({ request: data });
}
