// SERVER ONLY. A simple per-key request counter backed by the
// `rate_limit_hits` table (see supabase/schema.sql), for throttling public
// write endpoints that have no other auth to key off of. Uses the
// service-role client, since the table has no RLS policy for anon/authenticated.
//
// Fixed-window, not sliding-window: a key gets `limit` requests per
// `windowSeconds`, then resets. Good enough for abuse-deterrence on a
// low-traffic form; not meant to be exact under high concurrency.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const now = Date.now();
  const { data: existing } = await supabase.from('rate_limit_hits').select('*').eq('key', key).maybeSingle();

  if (!existing || now - new Date(existing.window_start).getTime() >= windowSeconds * 1000) {
    await supabase.from('rate_limit_hits').upsert({ key, window_start: new Date(now).toISOString(), count: 1 });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((windowSeconds * 1000 - (now - new Date(existing.window_start).getTime())) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  await supabase.from('rate_limit_hits').update({ count: existing.count + 1 }).eq('key', key);
  return { allowed: true };
}

// Vercel (and most proxies) set x-forwarded-for to "client, proxy1, proxy2...".
// The first entry is the original client. Falls back to a constant bucket key
// for local dev / anything without the header, rather than throwing.
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}
