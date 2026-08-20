// Client-side wrapper around the admin-only GBB endpoints — mirrors src/lib/admin-intents.ts.
'use client';

export type GbbStatus = 'new' | 'researching' | 'quoted' | 'converted' | 'archived';

export type GbbRequest = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  budget_eur: number | null;
  use_case: string;
  notes: string;
  price_proposal_eur: number | null;
  proposal_notes: string;
  status: GbbStatus;
  lang: string;
  created_at: string;
  updated_at: string;
};

export type FetchGbbResult =
  | { ok: true; requests: GbbRequest[] }
  | { ok: false; error: string; needsServiceRoleKey?: boolean };

export async function fetchGbbRequests(): Promise<FetchGbbResult> {
  let res: Response;
  try {
    res = await fetch('/api/admin/gbb', { cache: 'no-store' });
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }

  let body: { requests?: GbbRequest[]; error?: string; code?: string } = {};
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
  return { ok: true, requests: body.requests ?? [] };
}

export async function updateGbbRequest(
  id: string,
  patch: Partial<{ status: GbbStatus; priceProposalEur: number | null; proposalNotes: string }>,
): Promise<{ ok: true; request: GbbRequest } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch('/api/admin/gbb', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }
  const body = await res.json().catch(() => ({}) as { request?: GbbRequest; error?: string });
  if (!res.ok || !body.request) return { ok: false, error: body.error ?? `Request failed (${res.status}).` };
  return { ok: true, request: body.request };
}
