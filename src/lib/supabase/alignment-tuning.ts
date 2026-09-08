// Data-access layer for the single-row `alignment_tuning` table (supabase/schema.sql) — the
// admin-only override for /build's 3D scene alignment (mobo/CPU/cooler/RAM/storage offsets, mobo
// clearances, AIO tube routing). Same public-read/admin-write/Realtime shape as components.ts:
// reads go straight to Supabase with the anon key (the configurator has no login wall), writes
// are proxied through /api/admin/alignment-tuning so only a Clerk-verified admin can change it.
'use client';

import { createClient } from './client';
import type { AlignmentTuning } from '@/lib/build-scene';

// The row's `data` column only ever holds the fields Admin has actually changed — an empty/never-
// customized row is `{}`, and callers (build-scene's applyAlignmentTuning, AdminAlignmentPanel)
// merge it over their own defaults, so a partial shape here is intentional, not a bug.
export async function fetchAlignmentTuning(): Promise<Partial<AlignmentTuning> | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('alignment_tuning').select('data').eq('id', true).maybeSingle();
  if (error || !data) {
    if (error) console.error('fetchAlignmentTuning: request failed —', error.message);
    return null;
  }
  return (data.data as Partial<AlignmentTuning>) ?? null;
}

// Fires on any change to the row (there's only ever one), by anyone — same no-payload,
// refetch-on-any-event shape as subscribeComponents. Returns an unsubscribe function.
export function subscribeAlignmentTuning(onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel('alignment-tuning-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alignment_tuning' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function saveAlignmentTuning(data: Partial<AlignmentTuning>): Promise<void> {
  const res = await fetch('/api/admin/alignment-tuning', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error ?? 'saveAlignmentTuning: request failed');
  }
}
