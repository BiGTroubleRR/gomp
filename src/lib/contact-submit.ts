// Public submission for the "Contact us" form — mirrors src/lib/gbb-submit.ts.
'use client';

export type ContactMessageInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
};

export async function submitContactMessage(input: ContactMessageInput): Promise<{ ok: true } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch('/api/contact', {
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
