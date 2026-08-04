import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

// Browser-side Supabase client — used by every 'use client' page/context that reads or
// writes on behalf of the signed-in user (RLS enforces the per-user boundary server-side).
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
