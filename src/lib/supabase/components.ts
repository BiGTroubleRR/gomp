// Data-access layer for the shared PC-component catalog (the `components` table added in
// supabase/schema.sql). This replaces the old localStorage-only `gomp_components_db` used by
// Build and Admin: the catalog now lives in Supabase, so an Admin edit is visible to every
// visitor immediately (via fetch on load) and live (via the Realtime subscription below),
// instead of being trapped in whichever single browser made the edit.
//
// Reads (fetchComponentDb/subscribeComponents) go straight to Supabase with the anon key —
// the catalog is public data, /build has no login wall. Writes go through /api/admin/components
// instead: the anon key has no write access to this table (see supabase/schema.sql), so the
// insert/update/delete calls below are proxied through a route that checks Clerk admin status
// server-side and writes with the service-role key. Do not add direct Supabase writes here.
'use client';

import { createClient } from './client';
import { defaultComponentDb, type Category, type Component, type ComponentDb } from '@/lib/component-db-seed';
import { rowToComponent } from './component-mapping';

async function parseJsonOrThrow(res: Response, fallbackMessage: string): Promise<{ component?: Component; error?: string }> {
  const body = await res.json().catch(() => ({}) as { error?: string });
  if (!res.ok) throw new Error(body.error ?? fallbackMessage);
  return body;
}

// Reads the whole catalog, grouped back into the same ComponentDb shape Build/Admin already
// work with. Falls back to the static seed on any error (offline, RLS misconfigured, table
// not migrated yet) so a Supabase hiccup degrades to "last known good" instead of a blank page.
export async function fetchComponentDb(): Promise<ComponentDb> {
  const supabase = createClient();
  const { data, error } = await supabase.from('components').select('*').order('sort_order', { ascending: true });
  if (error || !data) {
    if (error) console.error('fetchComponentDb: falling back to seed data —', error.message);
    return defaultComponentDb();
  }
  const db = { mobo: [], cpu: [], cooler: [], ram: [], gpu: [], storage: [], psu: [], case: [], fan: [] } as ComponentDb;
  data.forEach((row) => {
    const cat = row.category as Category;
    if (!db[cat]) return;
    db[cat].push(rowToComponent(row));
  });
  return db;
}

// Subscribes to every change on the components table and calls `onChange` (no payload — the
// caller just refetches) whenever a row is inserted, updated, or deleted anywhere, by anyone.
// This is what makes an Admin edit show up on someone else's already-open /build tab without
// them reloading. Returns an unsubscribe function.
export function subscribeComponents(onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel('components-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'components' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function insertComponent(category: Category, comp: Component, sortOrder: number): Promise<Component> {
  const res = await fetch('/api/admin/components', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, comp, sortOrder }),
  });
  const body = await parseJsonOrThrow(res, 'insertComponent: request failed');
  if (!body.component) throw new Error('insertComponent: no component returned');
  return body.component;
}

export async function updateComponentRow(id: string, category: Category, comp: Component): Promise<Component> {
  const res = await fetch('/api/admin/components', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, category, comp }),
  });
  const body = await parseJsonOrThrow(res, 'updateComponentRow: request failed');
  if (!body.component) throw new Error('updateComponentRow: no component returned');
  return body.component;
}

export async function deleteComponentRow(id: string): Promise<void> {
  const res = await fetch('/api/admin/components', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  await parseJsonOrThrow(res, 'deleteComponentRow: request failed');
}
