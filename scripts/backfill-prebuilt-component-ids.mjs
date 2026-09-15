// One-time backfill for prebuilt_pcs and customer_builds' new *_id columns (see
// supabase/schema.sql) — these tables have always stored each slot (mobo/cpu/cooler/ram/gpu/
// storage/psu/case) as a free-text components.name, which is what let "Configure" on the GOMP
// 5090 prebuilt silently swap in an unrelated GPU: its GPU was later hidden (isLive: false) via
// hide-unavailable-edsystem-gpus.mjs, which deliberately left prebuilt_pcs.gpu untouched, and
// /build's findComp() had no fallback besides "grab whatever's first" once the exact name no
// longer resolved in the live-filtered catalog.
//
// This matches each slot's stored name against the FULL catalog (not is_live-filtered — a hidden
// part should still resolve here, same as GOMP 5090's WATERFORCE card) and writes the matching
// component id. Any slot that fails to resolve at all is reported, not guessed at — those are
// genuinely dangling references (e.g. a component that was renamed before this script existed, or
// deleted outright) that need a manual re-pick in Admin afterward.
//
// Usage: node --env-file=.env.local scripts/backfill-prebuilt-component-ids.mjs [--apply]
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

const SLOTS = ['mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case'];

async function backfillTable(table, labelField) {
  const { data: rows, error } = await supabase.from(table).select(`id,${labelField},${SLOTS.join(',')},${SLOTS.map((s) => `${s}_id`).join(',')}`);
  if (error) {
    console.error(`${table}: SELECT failed —`, error.message);
    return;
  }

  const { data: components, error: compErr } = await supabase.from('components').select('id,name');
  if (compErr) {
    console.error('components: SELECT failed —', compErr.message);
    return;
  }
  // Case-insensitive, exact-string match against the full (not is_live-filtered) catalog — a
  // hidden component must still resolve here, only a genuinely absent name should fail.
  const byName = new Map(components.map((c) => [c.name.trim().toLowerCase(), c.id]));

  console.log(`\n=== ${table} (${rows.length} row(s)) ===`);
  let toUpdate = 0;
  let unresolved = 0;
  for (const row of rows) {
    const label = row[labelField] || row.id;
    const changes = {};
    for (const slot of SLOTS) {
      const idField = `${slot}_id`;
      if (row[idField]) continue; // already backfilled
      const name = row[slot];
      if (!name) continue; // slot was never set
      const matchId = byName.get(String(name).trim().toLowerCase());
      if (matchId) {
        changes[idField] = matchId;
      } else {
        unresolved += 1;
        console.log(`  NO MATCH — "${label}" ${slot}: "${name}"`);
      }
    }
    if (Object.keys(changes).length === 0) continue;
    toUpdate += 1;
    console.log(`  ${label}:`, JSON.stringify(changes));
    if (apply) {
      const { error: updErr } = await supabase.from(table).update(changes).eq('id', row.id);
      if (updErr) console.error(`  UPDATE FAILED for ${label} —`, updErr.message);
    }
  }
  console.log(`${table}: ${toUpdate} row(s) ${apply ? 'updated' : 'would update'}, ${unresolved} slot(s) unresolved.`);
}

async function main() {
  await backfillTable('prebuilt_pcs', 'name');
  await backfillTable('customer_builds', 'title');
  if (!apply) console.log('\n(dry run — pass --apply to actually write these changes)');
}

await main();
