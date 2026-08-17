// Public submission for a Gomp Budget Builds request — mirrors checkout-intents.ts.
'use client';

export type GbbRequestInput = {
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  budgetEur: number | null;
  useCase: string;
  notes: string;
  lang: string;
};

export async function submitGbbRequest(input: GbbRequestInput): Promise<{ ok: true } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch('/api/gbb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }
  const body = await res.json().catch(() => ({}) as { error?: string });
  if (!res.ok) return { ok: false, error: body.error ?? `Request failed (${res.status}).` };
  return { ok: true };
}
