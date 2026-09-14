// Client-side wrapper around the admin-only Contact-message endpoints — mirrors src/lib/admin-intents.ts.
'use client';

export type ContactStatus = 'new' | 'read' | 'archived';

export type ContactMessage = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactStatus;
  created_at: string;
};

export type FetchContactMessagesResult =
  | { ok: true; messages: ContactMessage[] }
  | { ok: false; error: string; needsServiceRoleKey?: boolean };

export async function fetchContactMessages(): Promise<FetchContactMessagesResult> {
  let res: Response;
  try {
    res = await fetch('/api/admin/contact', { cache: 'no-store' });
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }

  let body: { messages?: ContactMessage[]; error?: string; code?: string } = {};
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
  return { ok: true, messages: body.messages ?? [] };
}

export async function updateContactMessageStatus(id: string, status: ContactStatus): Promise<{ error: string | null }> {
  try {
    const res = await fetch('/api/admin/contact', {
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
