// SERVER ONLY. Never import this from a client component.
//
// A Supabase client built with the service-role key, which bypasses row-level
// security entirely. It exists so the admin API routes can read
// `checkout_intents` — a table deliberately left unreadable by the public anon
// key because it holds customer names, emails, phones and addresses.
//
// The security model is therefore: the anon key (which ships in the browser
// bundle) can never read that PII at all, and the only path to it is a server
// route that first proves the caller is an admin via Clerk. The service-role
// key must stay server-side; if it ever reaches the browser, anyone can read
// and write every table regardless of RLS.
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export class MissingServiceRoleKeyError extends Error {
  constructor() {
    super(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (and to Vercel’s ' +
        'environment variables) from Supabase → Project Settings → API Keys → service_role. ' +
        'Keep it server-side only — never prefix it with NEXT_PUBLIC_.',
    );
    this.name = 'MissingServiceRoleKeyError';
  }
}

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
  if (!serviceKey) throw new MissingServiceRoleKeyError();

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
