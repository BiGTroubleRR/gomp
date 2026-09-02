// One-off backfill: recomputes `tier` for every live RAM row using the same speed/CAS-latency/
// stick-count formula as ramTier() in src/lib/passmark.ts (duplicated here — see the note there
// on why standalone .mjs scripts in this repo don't import app TS). Needed because only 2 of the
// 113 live RAM rows had any tier before this feature (the rest were bulk-imported with
// tier: null, since RAM has no PassMark score) — nothing re-runs automatically, so this is a
// one-time fix for rows already in the DB. import-ram-variants.mjs computes tier at insert time
// for any future re-run; this script is only for what's already live.
//
// Usage:
//   node --env-file=.env.local scripts/backfill-ram-tiers.mjs            (dry run — prints a summary, writes nothing)
//   node --env-file=.env.local scripts/backfill-ram-tiers.mjs --apply    (writes the new tier to every row that changed)
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run with --env-file=.env.local');
  process.exit(1);
}
const supabase = createClient(url, key);

// Mirrors ramTier() in src/lib/passmark.ts — see the comment there for why this is duplicated
// rather than imported. Keep in sync if the formula changes.
const RAM_UNKNOWN_CAS_RATIO = 150;
const RAM_STICK_BONUS = { 1: -8, 2: 0, 4: 8 };
function ramModuleCountFromSpecs(specs) {
  const m = (specs || '').match(/^(\d+)\s*×/);
  return m ? Number(m[1]) : 2;
}
function ramCasLatencyFromSpecs(specs) {
  const m = (specs || '').match(/CL\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}
function computeRamTier(speedMhz, specs) {
  if (!speedMhz) return null;
  const cas = ramCasLatencyFromSpecs(specs);
  const ratio = cas ? speedMhz / cas : RAM_UNKNOWN_CAS_RATIO;
  const score = ratio + (RAM_STICK_BONUS[ramModuleCountFromSpecs(specs)] ?? 0);
  if (score >= 200) return 'S';
  if (score >= 170) return 'A';
  if (score >= 140) return 'B';
  if (score >= 110) return 'C';
  return 'D';
}

const { data: rows, error } = await supabase
  .from('components')
  .select('id, name, specs, ram_speed_mhz, tier')
  .eq('category', 'ram');
if (error) {
  console.error('Fetch failed:', error.message);
  process.exit(1);
}

const changes = rows
  .map((r) => ({ ...r, newTier: computeRamTier(r.ram_speed_mhz, r.specs) }))
  .filter((r) => r.newTier !== r.tier);

const distribution = { S: 0, A: 0, B: 0, C: 0, D: 0 };
rows.forEach((r) => {
  const t = computeRamTier(r.ram_speed_mhz, r.specs);
  if (t) distribution[t]++;
});

console.log(`Total RAM rows: ${rows.length}`);
console.log(`Rows whose tier will change: ${changes.length}`);
console.log('New tier distribution:', distribution);
console.log('\nSample changes:');
changes.slice(0, 15).forEach((r) => console.log(`  ${r.tier ?? '—'} -> ${r.newTier}  (${r.ram_speed_mhz}MHz, "${r.specs}")  ${r.name}`));
if (changes.length > 15) console.log(`  ...and ${changes.length - 15} more`);

if (process.argv.includes('--apply')) {
  let ok = 0;
  let failed = 0;
  for (const r of changes) {
    const { error: updateError } = await supabase.from('components').update({ tier: r.newTier }).eq('id', r.id);
    if (updateError) {
      failed++;
      console.error(`UPDATE FAILED for ${r.id} (${r.name}):`, updateError.message);
    } else {
      ok++;
    }
  }
  console.log(`\nApplied: ${ok} updated, ${failed} failed.`);
} else {
  console.log('\n(dry run — pass --apply to actually write these tiers)');
}
