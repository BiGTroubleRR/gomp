// "My Orders" for the signed-in Clerk user. checkout_intents holds customer PII and has no public read
// policy, and Supabase RLS can't see a Clerk login, so the Account page reads through this route:
// it checks the Clerk session, then reads with the service-role client (same pattern as the admin routes).
//
// An order belongs to the caller if it was placed while they were signed in (clerk_user_id), OR if it
// was placed as a guest with the same email as the caller's VERIFIED primary Clerk email — so a guest
// order isn't lost once they register. An unverified email is never matched.
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';

const COLUMNS = 'id, reference_code, status, total_eur, build_items, created_at';

export async function GET() {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    throw e;
  }

  const user = await currentUser();
  const primary = user?.primaryEmailAddress;
  const verifiedEmail = primary && primary.verification?.status === 'verified' ? primary.emailAddress.trim().toLowerCase() : '';

  // Two plain queries merged by id (rather than one string-built .or() filter), so the email text can
  // never alter the filter itself.
  const byOwner = await supabase.from('checkout_intents').select(COLUMNS).eq('clerk_user_id', userId);
  if (byOwner.error) return NextResponse.json({ error: byOwner.error.message }, { status: 500 });

  // ilike treats % and _ as wildcards — escape them so an email can only ever match itself.
  const byEmail = verifiedEmail
    ? await supabase.from('checkout_intents').select(COLUMNS).ilike('email', verifiedEmail.replace(/[\\%_]/g, (c) => `\\${c}`))
    : { data: [], error: null };
  if (byEmail.error) return NextResponse.json({ error: byEmail.error.message }, { status: 500 });

  const merged = new Map<string, NonNullable<typeof byOwner.data>[number]>();
  for (const row of [...(byOwner.data ?? []), ...(byEmail.data ?? [])]) merged.set(row.id, row);
  const orders = [...merged.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return NextResponse.json({ orders });
}
