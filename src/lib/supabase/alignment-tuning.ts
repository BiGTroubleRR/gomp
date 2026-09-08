// Data-access layer for the single-row `alignment_tuning` table (supabase/schema.sql) — the
// admin-only override for /build's 3D scene alignment (mobo/CPU/cooler/RAM/storage/GPU offsets,
// mobo clearances, AIO tube routing, GPU vertical-mount clearances). Same public-read/admin-write/
// Realtime shape as components.ts: reads go straight to Supabase with the anon key (the
// configurator has no login wall), writes are proxied through /api/admin/alignment-tuning so only
// a Clerk-verified admin can change it.
//
// The row holds a separate copy of every alignment field per motherboard form factor — a linear
// real-mm scale (see build-scene.ts's moboScales) isn't enough to make an ATX-tuned offset land
// right on a Mini-ITX board, since smaller form factors don't just shrink the same layout, they
// rearrange it. `byFormFactor[X]` is itself partial (only the fields Admin has actually changed
// for that form factor), so an unconfigured form factor cleanly falls back to build-scene.ts's
// own hardcoded defaults via the same merge applyAlignmentTuning already does.
'use client';

import { createClient } from './client';
import type { AlignmentTuning } from '@/lib/build-scene';
import type { FormFactor } from '@/lib/component-db-seed';

export type AlignmentTuningConfig = {
  byFormFactor: Partial<Record<FormFactor, Partial<AlignmentTuning>>>;
};

export async function fetchAlignmentTuningConfig(): Promise<Partial<AlignmentTuningConfig> | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('alignment_tuning').select('data').eq('id', true).maybeSingle();
  if (error || !data) {
    if (error) console.error('fetchAlignmentTuningConfig: request failed —', error.message);
    return null;
  }
  return (data.data as Partial<AlignmentTuningConfig>) ?? null;
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

export async function saveAlignmentTuningConfig(config: Partial<AlignmentTuningConfig>): Promise<void> {
  const res = await fetch('/api/admin/alignment-tuning', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: config }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error ?? 'saveAlignmentTuningConfig: request failed');
  }
}

// Pulls one form factor's slice back out, ready to hand straight to a BuildScene's
// applyAlignmentTuning — a missing/never-configured form factor resolves to `{}`, which
// applyAlignmentTuning already treats as "change nothing, keep the scene's own defaults".
export function resolveAlignmentTuning(config: Partial<AlignmentTuningConfig> | null, formFactor: FormFactor): Partial<AlignmentTuning> {
  return config?.byFormFactor?.[formFactor] ?? {};
}
