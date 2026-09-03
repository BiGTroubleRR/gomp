// Public submission for a "Gomp Budget Builds" (secondhand-parts) request. Same reasoning as
// /api/checkout/route.ts: the anon key has no insert policy on gbb_requests, so this is the only
// path in, and it's rate-limited by IP so a script can't flood the table.
import { NextResponse } from 'next/server';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { checkRateLimit, clientIpFromHeaders } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type GbbRequestBody = {
  userId?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  budgetEur?: number | string;
  useCase?: string;
  notes?: string;
  lang?: string;
};

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    throw e;
  }

  const ip = clientIpFromHeaders(request.headers);
  const rateLimit = await checkRateLimit(supabase, `gbb:${ip}`, { limit: 5, windowSeconds: 10 * 60 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json().catch(() => null)) as GbbRequestBody | null;
  if (!body) return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });

  const email = (body.email ?? '').trim();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });

  const budgetParsed = body.budgetEur != null && body.budgetEur !== '' ? Number(body.budgetEur) : null;
  const budgetEur = budgetParsed != null && !isNaN(budgetParsed) && budgetParsed >= 0 ? budgetParsed : null;

  const { data, error } = await supabase
    .from('gbb_requests')
    .insert({
      user_id: body.userId || null,
      first_name: (body.firstName ?? '').trim(),
      last_name: (body.lastName ?? '').trim(),
      email,
      phone: (body.phone ?? '').trim(),
      budget_eur: budgetEur,
      use_case: (body.useCase ?? '').trim(),
      notes: (body.notes ?? '').trim(),
      lang: body.lang === 'sk' ? 'sk' : body.lang === 'cz' ? 'cz' : 'en',
    })
    .select('id')
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Submission failed.' }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
