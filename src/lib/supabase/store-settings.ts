// Data-access layer for the single-row `store_settings` table (supabase/schema.sql) — small
// site-wide business settings that must be one real shared value, not per-browser localStorage
// like the existing "Marketingová marža" markup. Same public-read/admin-write/Realtime shape as
// alignment-tuning.ts: reads go straight to Supabase with the anon key (every public page needs
// the current VAT rate to price things correctly), writes are proxied through
// /api/admin/store-settings so only a Clerk-verified admin can change it.
'use client';

import { createClient } from './client';

export type StoreSettings = {
  vatRatePct: number;
};

export const DEFAULT_VAT_RATE_PCT = 21;

export function defaultStoreSettings(): StoreSettings {
  return { vatRatePct: DEFAULT_VAT_RATE_PCT };
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const supabase = createClient();
  const { data, error } = await supabase.from('store_settings').select('data').eq('id', true).maybeSingle();
  if (error || !data) {
    if (error) {
      // PGRST205 = "table not found" — expected until the store_settings migration in
      // supabase/schema.sql has been run; a normal, already-handled fallback, not a real error,
      // so this stays a quiet warning rather than console.error (which Next.js's dev overlay
      // otherwise surfaces as a build "issue"). Anything else is unexpected and still loud.
      if (error.code === 'PGRST205') {
        console.warn('fetchStoreSettings: store_settings table not found yet — using default VAT rate. Run the migration in supabase/schema.sql to fix.');
      } else {
        console.error('fetchStoreSettings: request failed —', error.message);
      }
    }
    return defaultStoreSettings();
  }
  const raw = data.data as Partial<StoreSettings> | null;
  return { vatRatePct: typeof raw?.vatRatePct === 'number' ? raw.vatRatePct : DEFAULT_VAT_RATE_PCT };
}

// Fires on any change to the row (there's only ever one), by anyone — same no-payload,
// refetch-on-any-event shape as subscribeComponents/subscribeAlignmentTuning. Returns an
// unsubscribe function.
export function subscribeStoreSettings(onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel('store-settings-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  const res = await fetch('/api/admin/store-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: settings }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error ?? 'saveStoreSettings: request failed');
  }
}
