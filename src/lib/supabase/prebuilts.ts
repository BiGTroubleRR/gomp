// Data-access layer for the "Configure this PC" catalog (the `prebuilt_pcs` table added in
// supabase/schema.sql) — read by the homepage hero, the Featured Builds grid, /shop, and the
// /build?prebuilt=<id> carry-over. Mirrors src/lib/supabase/components.ts exactly: reads go
// straight to Supabase with the anon key (public data, no login wall), writes go through
// /api/admin/prebuilts since the anon key has no write access to this table (see
// supabase/schema.sql). Do not add direct Supabase writes here.
'use client';

import { defaultBuilds, type Build } from '@/lib/component-db-seed';
import { createClient } from './client';
import { rowToBuild, type PrebuiltRow } from './prebuilt-mapping';

async function parseJsonOrThrow(res: Response, fallbackMessage: string): Promise<{ build?: Build; error?: string }> {
  const body = await res.json().catch(() => ({}) as { error?: string });
  if (!res.ok) throw new Error(body.error ?? fallbackMessage);
  return body;
}

// Falls back to the static defaultBuilds() seed on any error (offline, RLS misconfigured, table
// not migrated yet) so a Supabase hiccup degrades to the last-known lineup rather than an empty
// homepage/shop.
export async function fetchPrebuilts(): Promise<Build[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('prebuilt_pcs').select('*').order('sort_order', { ascending: true });
  if (error || !data || data.length === 0) {
    if (error) console.error('fetchPrebuilts: falling back to defaultBuilds() —', error.message);
    return defaultBuilds();
  }
  return (data as PrebuiltRow[]).map(rowToBuild);
}

// Subscribes to every change on the prebuilt_pcs table and calls `onChange` (no payload — the
// caller just refetches) whenever a row is inserted, updated, or deleted. Returns an unsubscribe
// function.
export function subscribePrebuilts(onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel('prebuilt-pcs-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prebuilt_pcs' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function insertPrebuilt(build: Build, sortOrder: number): Promise<Build> {
  const res = await fetch('/api/admin/prebuilts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ build, sortOrder }),
  });
  const body = await parseJsonOrThrow(res, 'insertPrebuilt: request failed');
  if (!body.build) throw new Error('insertPrebuilt: no build returned');
  return body.build;
}

export async function updatePrebuilt(id: string, build: Build): Promise<Build> {
  const res = await fetch('/api/admin/prebuilts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, build }),
  });
  const body = await parseJsonOrThrow(res, 'updatePrebuilt: request failed');
  if (!body.build) throw new Error('updatePrebuilt: no build returned');
  return body.build;
}

export async function deletePrebuilt(id: string): Promise<void> {
  const res = await fetch('/api/admin/prebuilts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  await parseJsonOrThrow(res, 'deletePrebuilt: request failed');
}
