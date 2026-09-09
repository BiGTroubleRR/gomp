// Flips `is_live = false` on every live GPU row eD system a.s. itself marks "Dočasně nedostupné"
// (temporarily unavailable) on its own product page — see scripts/check-edsystem-gpu-availability.mjs
// for the full status breakdown this was picked from. Deliberately does NOT touch "Skladem na
// dotaz" (in stock on request) or "Obvykle N dnů" (usually ships in N days) rows — those are
// backorder-with-lead-time states, still orderable from the distributor, not "unavailable."
//
// One of these 12 (GIGABYTE GeForce RTX 5090 XTREME WATERFORCE WB 32G GDDR7) is the exact GPU
// GOMP_FLGSHP_5090 currently uses — hidden here same as the rest (it genuinely isn't available
// right now), but that prebuilt's own gpu field is a separate plain-text reference this script
// does not touch, so it will keep displaying that name until an admin picks a different GPU for
// it. Flagged in this script's own run output, not silently left for someone to notice later.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const UNAVAILABLE = [
  'PNY GeForce RTX 5070 12GB Triple Fan GDDR7',
  'GIGABYTE GeForce RTX 5090 XTREME WATERFORCE WB 32G GDDR7',
  'GIGABYTE GeForce RTX 5060 Ti AERO OC 16G GDDR7',
  'GIGABYTE GeForce RTX 5090 MASTER ICE 32G GDDR7',
  'PNY GeForce RTX 5060 Ti 16GB Dual Fan GDDR7',
  'GIGABYTE GeForce RTX 5090 STEALTH ICE 32G GDDR7',
  'PNY GeForce RTX 5060 Ti 16GB OC GDDR7',
  'PNY GeForce RTX 5060 8GB Dual Fan OC GDDR7',
  'GIGABYTE GeForce RTX 5090 MASTER 32G GDDR7',
  'PNY GeForce RTX 5060 8GB Dual Fan GDDR7',
  'PNY GeForce RTX 5080 16GB ARGB OC Triple Fan GDDR7',
  'PNY GeForce RTX 5060 Ti 16GB ARGB OC GDDR7',
];

const apply = process.argv.includes('--apply');

const { data: prebuilts } = await supabase.from('prebuilt_pcs').select('name,gpu');
const { data: customer } = await supabase.from('customer_builds').select('title,gpu');

for (const name of UNAVAILABLE) {
  const { data, error } = await supabase.from('components').select('id').eq('category', 'gpu').eq('name', name);
  if (error) { console.error(`SELECT failed for ${name}:`, error.message); continue; }
  if (!data.length) { console.warn(`NOT FOUND: ${name}`); continue; }

  const usedBy = [...prebuilts.filter((p) => p.gpu === name).map((p) => `prebuilt "${p.name}"`), ...customer.filter((c) => c.gpu === name).map((c) => `customer build "${c.title}"`)];
  console.log(`${name}${usedBy.length ? `  <<< STILL REFERENCED BY ${usedBy.join(', ')} — pick a different GPU for it in Admin` : ''}`);

  if (apply) {
    const { error: updErr } = await supabase.from('components').update({ is_live: false }).eq('category', 'gpu').eq('name', name);
    if (updErr) console.error(`UPDATE failed for ${name}:`, updErr.message);
  }
}

console.log(apply ? '\nApplied.' : '\n(dry run — pass --apply to actually flip is_live)');
