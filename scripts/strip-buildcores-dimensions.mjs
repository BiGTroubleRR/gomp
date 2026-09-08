// One-off: null every physical-dimension column that traces back to BuildCores OpenDB, across
// the ENTIRE live `components` table — including rows whose name/price/specs are otherwise 100%
// eD system-sourced (GPU/motherboard), because these specific columns were never populated by
// anything except BuildCores. Confirmed three ways: supabase/schema.sql's own comment on this
// column family; scripts/import-edsystem-cases.mjs's header, which says case_width/height/depth_mm
// were pulled from BuildCores because eD's own dimension order was brand-inconsistent; and
// scripts/import-edsystem-gpus.mjs's CHIPSET_TABLE, which derives gpu_length_mm/gpu_slot_width as
// the median of this catalog's pre-existing anchor rows — and those anchors' own dimensions trace
// to scripts/buildcores-matches.json (e.g. its "Fractal Design Meshify 2" entry has
// width/height/depth 210/475/424, exactly matching that row's live values before this ran).
//
// Deliberately NOT touched: max_gpu_length_mm, max_cooler_height_mm, max_psu_length_mm,
// max_radiator_mm, fan_mounts (eD system's own case-clearance spec-table data, confirmed by
// import-edsystem-cases.mjs's header as eD-only, not present in BuildCores at all for the case
// category) and ram_generation/ram_speed_mhz/ram_family/tier/passmark (spec facts read off
// product titles/listings, never identified as BuildCores-derived).
//
// Safe: src/lib/build-scene.ts and src/lib/component-db-seed.ts guard every dimension read
// (`if (comp.xMm && ...)`) and fall back to generic per-category sizing, so nulling these never
// crashes the 3D configurator — it just makes part placement/collision-checking less precise
// until real numbers are re-entered from non-BuildCores sources (eD system spec pages,
// manufacturer datasheets) later.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COLUMNS_TO_NULL = [
  'case_width_mm',
  'case_height_mm',
  'case_depth_mm',
  'gpu_length_mm',
  'gpu_slot_width',
  'cooler_height_mm',
  'cooler_radiator_mm',
  'psu_length_mm',
  'ram_height_mm',
];

const apply = process.argv.includes('--apply');

const orFilter = COLUMNS_TO_NULL.map((c) => `${c}.not.is.null`).join(',');
const { data: affected, error: selErr } = await supabase.from('components').select('id,category,name').or(orFilter);
if (selErr) { console.error('SELECT failed:', selErr.message); process.exit(1); }

console.log(`Rows with at least one BuildCores-derived dimension field set: ${affected.length}`);
const byCat = {};
for (const r of affected) byCat[r.category] = (byCat[r.category] || 0) + 1;
console.log(JSON.stringify(byCat, null, 2));

if (apply) {
  const patch = Object.fromEntries(COLUMNS_TO_NULL.map((c) => [c, null]));
  const { error: updErr, count } = await supabase.from('components').update(patch).or(orFilter).select('id', { count: 'exact' });
  if (updErr) { console.error('UPDATE failed:', updErr.message); process.exit(1); }
  console.log(`\nApplied: nulled ${COLUMNS_TO_NULL.join(', ')} on ${count ?? affected.length} rows.`);
} else {
  console.log('\n(dry run — pass --apply to actually null these columns)');
}
