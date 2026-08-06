// Client-side wrapper around the admin-only order-request endpoints.
//
// These go through /api/admin/* rather than talking to Supabase directly,
// because `checkout_intents` has no public read policy — it holds customer PII
// and is only reachable from a server route that has verified the caller is an
// admin via Clerk. See src/app/api/admin/intents/route.ts.
'use client';

export type IntentStatus = 'new' | 'contacted' | 'converted' | 'archived';

export type CheckoutIntent = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  zip: string;
  payment_method: 'card' | 'google_pay' | 'apple_pay';
  shipping_method: 'standard' | 'express' | 'overnight';
  parts_total_eur: number;
  shipping_eur: number;
  assembly_eur: number;
  discount_eur: number;
  total_eur: number;
  promo_code: string;
  build_items: { category: string; name: string; price_eur: number }[];
  display_currency: string;
  lang: string;
  contact_consent: boolean;
  status: IntentStatus;
  created_at: string;
};

export type FetchIntentsResult =
  | { ok: true; intents: CheckoutIntent[] }
  | { ok: false; error: string; needsServiceRoleKey?: boolean };

export async function fetchIntents(): Promise<FetchIntentsResult> {
  let res: Response;
  try {
    res = await fetch('/api/admin/intents', { cache: 'no-store' });
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }

  let body: { intents?: CheckoutIntent[]; error?: string; code?: string } = {};
  try {
    body = await res.json();
  } catch {
    /* fall through to status-based message below */
  }

  if (!res.ok) {
    return {
      ok: false,
      error: body.error ?? `Request failed (${res.status}).`,
      needsServiceRoleKey: body.code === 'missing_service_role_key',
    };
  }
  return { ok: true, intents: body.intents ?? [] };
}

export async function updateIntentStatus(id: string, status: IntentStatus): Promise<{ error: string | null }> {
  try {
    const res = await fetch('/api/admin/intents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: (body as { error?: string }).error ?? `Request failed (${res.status}).` };
    }
    return { error: null };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}
