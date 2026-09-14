// One-time backfill for checkout_intents rows that predate the reference_code column (see
// supabase/schema.sql and src/app/api/checkout/route.ts). New rows get a code generated at
// insert time; this fills in the same GOMP-XXXX-XXXX format for older rows so every intent has
// one to show in Admin and, for signed-in customers, their Account "My Orders" tab.
//
// Usage: node --env-file=.env.local scripts/backfill-checkout-reference-codes.mjs [--apply]
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

function generateReferenceCode() {
  const seed = Math.floor(Math.random() * 1e9);
  return `GOMP-${seed.toString(36).toUpperCase().slice(0, 4)}-${String(seed).slice(-4)}`;
}

const { data: rows, error } = await supabase.from('checkout_intents').select('id,reference_code').is('reference_code', null);
if (error) {
  console.error('SELECT failed —', error.message);
  process.exit(1);
}

console.log(`checkout_intents: ${rows.length} row(s) missing a reference_code.`);

if (apply) {
  for (const row of rows) {
    const { error: updErr } = await supabase
      .from('checkout_intents')
      .update({ reference_code: generateReferenceCode() })
      .eq('id', row.id);
    if (updErr) console.error(`UPDATE failed for ${row.id} —`, updErr.message);
  }
  const { count } = await supabase
    .from('checkout_intents')
    .select('id', { count: 'exact', head: true })
    .is('reference_code', null);
  console.log(`Done. ${count ?? 0} row(s) still missing a reference_code.`);
} else {
  console.log('(dry run — pass --apply to actually backfill)');
}
