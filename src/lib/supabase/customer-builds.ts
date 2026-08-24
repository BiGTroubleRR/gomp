// Data-access layer for "Zákaznícke GOMPy" (the `customer_builds` table added in
// supabase/schema.sql) — a public showcase of already-completed customer PC builds,
// shown at /customer-builds. Mirrors src/lib/supabase/components.ts exactly: reads go
// straight to Supabase with the anon key (public data, no login wall), writes go
// through /api/admin/customer-builds since the anon key has no write access to this
// table (see supabase/schema.sql). Do not add direct Supabase writes here.
'use client';

import { createClient } from './client';
import { rowToCustomerBuild, type CustomerBuild } from './customer-build-mapping';

async function parseJsonOrThrow(res: Response, fallbackMessage: string): Promise<{ build?: CustomerBuild; error?: string }> {
  const body = await res.json().catch(() => ({}) as { error?: string });
  if (!res.ok) throw new Error(body.error ?? fallbackMessage);
  return body;
}

// Falls back to an empty list on any error (offline, RLS misconfigured, table not
// migrated yet) so a Supabase hiccup degrades to "nothing shown" rather than a crash.
export async function fetchCustomerBuilds(): Promise<CustomerBuild[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('customer_builds').select('*').order('sort_order', { ascending: true });
  if (error || !data) {
    if (error) console.error('fetchCustomerBuilds: falling back to empty list —', error.message);
    return [];
  }
  return data.map(rowToCustomerBuild);
}

// Subscribes to every change on the customer_builds table and calls `onChange` (no
// payload — the caller just refetches) whenever a row is inserted, updated, or deleted.
// Returns an unsubscribe function.
export function subscribeCustomerBuilds(onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel('customer-builds-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_builds' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function insertCustomerBuild(build: CustomerBuild, sortOrder: number): Promise<CustomerBuild> {
  const res = await fetch('/api/admin/customer-builds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ build, sortOrder }),
  });
  const body = await parseJsonOrThrow(res, 'insertCustomerBuild: request failed');
  if (!body.build) throw new Error('insertCustomerBuild: no build returned');
  return body.build;
}

export async function updateCustomerBuild(id: string, build: CustomerBuild): Promise<CustomerBuild> {
  const res = await fetch('/api/admin/customer-builds', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, build }),
  });
  const body = await parseJsonOrThrow(res, 'updateCustomerBuild: request failed');
  if (!body.build) throw new Error('updateCustomerBuild: no build returned');
  return body.build;
}

export async function deleteCustomerBuild(id: string): Promise<void> {
  const res = await fetch('/api/admin/customer-builds', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  await parseJsonOrThrow(res, 'deleteCustomerBuild: request failed');
}
