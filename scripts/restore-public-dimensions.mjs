// Restores physical-dimension data that scripts/strip-buildcores-dimensions.mjs nulled, using
// only publicly-available/non-BuildCores sources — not a revert of that script's intent (this
// project still won't touch the BuildCores OpenDB dataset or credit it), just backfilling real,
// independently-known measurements of real products.
//
// Sources per category:
// - case: the 4 pre-existing hand-curated anchors and the 13 real eD system cases (scripts/
//   import-edsystem-cases.mjs) — exact width/height/depth in mm, each independently verifiable on
//   the manufacturer's own product page (Fractal Design / Cooler Master / NZXT).
// - cooler: the 2 pre-existing anchors — NZXT Kraken 360 RGB (360mm AIO radiator, per NZXT's own
//   spec page) and Noctua NH-D15 chromax (165mm tower height, per Noctua's own spec page).
// - psu: the 2 pre-existing anchors — Corsair HX1200i ATX 3.0 (200mm) and Seasonic FOCUS GX-850
//   (140mm), both per the manufacturers' own spec pages.
// - ram: the 2 pre-existing anchors — G.Skill Trident Z5 (44mm heatsink height) and Corsair
//   Dominator (56mm heatsink height), both per the manufacturers' own spec pages.
// - gpu: scripts/import-edsystem-gpus.mjs's own CHIPSET_TABLE (untouched by the BuildCores
//   cleanup) already carries a public, non-BuildCores per-chipset length/slot-width figure ("built
//   from the MEDIAN of this catalog's own existing manufacturer-variant rows... not invented" —
//   see that script's header). Re-derives gpu_length_mm/gpu_slot_width for every live GPU row by
//   matching its chipset the same way that script does.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CASE_DIMS = {
  // Pre-existing anchors
  'Fractal Design Pop Air': { width: 215, height: 454, depth: 473.5 },
  'Fractal Design Meshify 2': { width: 210, height: 475, depth: 424 },
  'Lian Li O11D EVO XL': { width: 285, height: 517, depth: 490 },
  // NZXT H1 V2 (SFF, fixed dual-chamber design) never had width/height/depth on file — left unset.
  // Real eD system cases (scripts/import-edsystem-cases.mjs)
  'Fractal Design Define 7 XL': { width: 240, height: 566, depth: 604 },
  'Fractal Design Define 7': { width: 240, height: 475, depth: 547 },
  'Fractal Design North XL': { width: 240, height: 509, depth: 503 },
  'Fractal Design Core 2300': { width: 195, height: 431, depth: 450 },
  'Cooler Master MasterBox MB520 ARGB': { width: 217, height: 469, depth: 496 },
  'Cooler Master MasterFrame 600': { width: 261, height: 544, depth: 531 },
  'Cooler Master Elite 600': { width: 285, height: 410, depth: 445 },
  'Cooler Master Elite 302': { width: 203.5, height: 430, depth: 390 },
  'Cooler Master CMP 520': { width: 204, height: 463, depth: 439 },
  'NZXT H9 Flow RGB': { width: 315, height: 506, depth: 481 },
  'NZXT H6 Flow': { width: 287, height: 435, depth: 415 },
  'NZXT H5 Flow': { width: 225, height: 465, depth: 430 },
  'NZXT H3 Flow': { width: 225, height: 400, depth: 389 },
};

const COOLER_DIMS = {
  'NZXT Kraken 360 RGB': { cooler_radiator_mm: 360 },
  'Noctua NH-D15 chromax': { cooler_height_mm: 165 },
};

const PSU_DIMS = {
  'Corsair HX1200i ATX 3.0': { psu_length_mm: 200 },
  'Seasonic FOCUS GX-850': { psu_length_mm: 140 },
};

const RAM_DIMS = {
  'G.Skill Trident Z5 32GB DDR5 6400': { ram_height_mm: 44 },
  'Corsair Dominator 32GB DDR5 5600': { ram_height_mm: 56 },
};

// Same as scripts/import-edsystem-gpus.mjs's own CHIPSET_TABLE/chipFor — public, chipset-level
// reference lengths, not per-AIB-model exact, but not BuildCores-derived either.
const CHIP_RE = /RTX\s?(40|50)(\d0)(?:\s?(Ti\s?Super|Super|Ti))?/i;
function chipFor(name) {
  const m = name.match(CHIP_RE);
  if (!m) return null;
  const num = m[1] + m[2];
  let suf = '';
  if (m[3]) {
    const s = m[3].toLowerCase().replace(/\s+/g, ' ');
    if (s === 'ti super') suf = ' Ti Super';
    else if (s === 'super') suf = ' Super';
    else if (s === 'ti') suf = ' Ti';
  }
  return `RTX ${num}${suf}`;
}
const CHIPSET_TABLE = {
  'RTX 4060': { len: 233, slot: 2 },
  'RTX 4060 Ti': { len: 250, slot: 3 },
  'RTX 4070': { len: 250, slot: 2.15 },
  'RTX 4070 Super': { len: 268, slot: 3 },
  'RTX 4070 Ti': { len: 322, slot: 3 },
  'RTX 4070 Ti Super': { len: 287, slot: 3 },
  'RTX 4080': { len: 329, slot: 4 },
  'RTX 4080 Super': { len: 326, slot: 3 },
  'RTX 4090': { len: 328, slot: 4 },
  'RTX 5060': { len: 255, slot: 2 },
  'RTX 5060 Ti': { len: 268, slot: 2 },
  'RTX 5070': { len: 250, slot: 2 },
  'RTX 5070 Ti': { len: 319, slot: 3 },
  'RTX 5080': { len: 318, slot: 3 },
  'RTX 5090': { len: 332, slot: 3.8 },
};
// NVIDIA Founders Edition cards use NVIDIA's own reference PCB/cooler, not a board-partner design
// — published by NVIDIA itself (e.g. RTX 5090 FE: 304mm long, 2-slot).
const FE_OVERRIDES = {
  'NVIDIA RTX 5090 FE': { len: 304, slot: 2 },
};

const apply = process.argv.includes('--apply');
const report = [];

async function restoreGroup(label, category, table, colFn) {
  for (const [name, values] of Object.entries(table)) {
    const patch = typeof colFn === 'function' ? colFn(values) : values;
    const { data, error } = await supabase.from('components').select('id').eq('category', category).eq('name', name);
    if (error) { console.error(`SELECT failed for ${category}/${name}:`, error.message); continue; }
    if (!data.length) { report.push(`NOT FOUND (${label}): ${category} / "${name}"`); continue; }
    report.push(`${label}: ${category} / "${name}" -> ${JSON.stringify(patch)} (${data.length} row(s))`);
    if (apply) {
      const { error: updErr } = await supabase.from('components').update(patch).eq('category', category).eq('name', name);
      if (updErr) console.error(`UPDATE failed for ${category}/${name}:`, updErr.message);
    }
  }
}

await restoreGroup('case', 'case', CASE_DIMS, (v) => ({ case_width_mm: v.width, case_height_mm: v.height, case_depth_mm: v.depth }));
await restoreGroup('cooler', 'cooler', COOLER_DIMS);
await restoreGroup('psu', 'psu', PSU_DIMS);
await restoreGroup('ram', 'ram', RAM_DIMS);

// GPU: chipset-based backfill across every live row, plus FE overrides for exact reference cards.
const { data: gpuRows, error: gpuErr } = await supabase.from('components').select('id,name').eq('category', 'gpu');
if (gpuErr) { console.error('GPU select failed:', gpuErr.message); process.exit(1); }
let gpuUpdated = 0;
let gpuUnmatched = 0;
for (const row of gpuRows) {
  const fe = FE_OVERRIDES[row.name];
  const chip = fe ? null : chipFor(row.name);
  const ref = fe ?? (chip ? CHIPSET_TABLE[chip] : null);
  if (!ref) { gpuUnmatched++; continue; }
  const patch = { gpu_length_mm: ref.len, gpu_slot_width: ref.slot };
  gpuUpdated++;
  if (apply) {
    const { error: updErr } = await supabase.from('components').update(patch).eq('id', row.id);
    if (updErr) console.error(`GPU update failed for ${row.name}:`, updErr.message);
  }
}
report.push(`gpu: ${gpuUpdated} rows matched to a chipset/FE reference, ${gpuUnmatched} unmatched (name doesn't parse to a known RTX 40/50 chip)`);

console.log(report.join('\n'));
console.log(apply ? '\nApplied.' : '\n(dry run — pass --apply to write these values)');
