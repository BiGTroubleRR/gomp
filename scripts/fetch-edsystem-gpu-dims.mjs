// Fetches exact per-model GPU card dimensions ("Velikost karty": length x width x thickness, mm)
// directly from each product's own eD system a.s. (edshop.edsystem.cz) page — public data, no
// login needed, confirmed by a direct fetch of a sample product page. Replaces the chipset-level
// median estimate in scripts/restore-public-dimensions.mjs with real per-card measurements.
//
// Matching: re-parses scripts/import-edsystem-gpus.mjs's own RAW_ITEMS + cleanName() (copied
// verbatim below, not imported, so this script never executes that file's insert logic) to find
// each live catalog GPU's original eD product URL by name.
//
// The length goes to gpu_length_mm, the real card height/width goes to gpu_width_mm (drives the
// 3D box's height axis — see build-scene.ts's dimensionSpecsFor('gpu', ...)), the thickness
// converts to a slot-count via the same ~0.8in (20.32mm) PCIe slot pitch already used catalog-wide
// (see SLOT_PITCH_MM in src/lib/build-scene.ts), and the full real "LxWxDmm" triplet is also
// appended to the specs text (matching the pattern already used for cases) for a human-readable copy.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SLOT_PITCH_MM = 20.32; // 0.8in, matches build-scene.ts's SLOT_PITCH_MM

function cleanName(rawTitle) {
  let s = rawTitle.replace(/\s+/g, ' ').trim();
  s = s.replace(/\bVGA\b\s*/gi, '').replace(/\bNVIDIA\b\s*/gi, '').replace(/\bAMD\b\s*/gi, '');
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  let base = parts[0];
  const rest = parts.slice(1).join(' ');
  const mem = rest.match(/GDDR\d+X?/i);
  if (mem && !new RegExp(mem[0], 'i').test(base)) base = `${base} ${mem[0].toUpperCase()}`;
  return base;
}

const scriptText = readFileSync(new URL('./import-edsystem-gpus.mjs', import.meta.url), 'utf8');
const itemRe = /\{"h":"([^"]+)","n":"([^"]+)","i":"[^"]*"\}/g;
const nameToHref = new Map();
for (const m of scriptText.matchAll(itemRe)) {
  const [, href, title] = m;
  const name = cleanName(title);
  if (!nameToHref.has(name)) nameToHref.set(name, href);
}

const { data: rows, error } = await supabase.from('components').select('id,name,specs,gpu_length_mm,gpu_slot_width').eq('category', 'gpu');
if (error) { console.error('SELECT failed:', error.message); process.exit(1); }

const apply = process.argv.includes('--apply');
const EDSYSTEM = 'https://edshop.edsystem.cz';
const SIZE_RE = /Velikost karty<\/th><td[^>]*>([\d.,]+)\s*x\s*([\d.,]+)\s*x\s*([\d.,]+)\s*mm/i;

const results = [];
for (const row of rows) {
  const href = nameToHref.get(row.name);
  if (!href) { results.push({ name: row.name, status: 'NO_URL_MATCH' }); continue; }
  try {
    const res = await fetch(EDSYSTEM + href);
    if (!res.ok) { results.push({ name: row.name, status: `HTTP_${res.status}` }); continue; }
    const html = await res.text();
    const m = html.match(SIZE_RE);
    if (!m) { results.push({ name: row.name, status: 'NO_SIZE_ROW', href }); continue; }
    const length = parseFloat(m[1].replace(',', '.'));
    const width = parseFloat(m[2].replace(',', '.'));
    const thickness = parseFloat(m[3].replace(',', '.'));
    const slotWidth = Math.round((thickness / SLOT_PITCH_MM) * 2) / 2; // nearest 0.5 slot
    // Strips ANY existing dims segment wherever it sits (earlier enrichment already embeds it
    // mid-string, right after the PCIe generation, not at the end — a $-anchored strip here
    // previously missed that and silently duplicated the segment) before appending the freshly
    // fetched one at the end.
    const newSpecs = row.specs.replace(/ · [\d.]+×[\d.]+×[\d.]+mm/g, '') + ` · ${length}×${width}×${thickness}mm`;
    results.push({ name: row.name, status: 'OK', length, width, thickness, slotWidth, newSpecs });
    if (apply) {
      const { error: updErr } = await supabase
        .from('components')
        .update({ gpu_length_mm: length, gpu_slot_width: slotWidth, gpu_width_mm: width, specs: newSpecs })
        .eq('id', row.id);
      if (updErr) console.error(`UPDATE failed for ${row.name}:`, updErr.message);
    }
  } catch (e) {
    results.push({ name: row.name, status: 'FETCH_ERROR', error: e.message });
  }
  await new Promise((r) => setTimeout(r, 150)); // polite delay between requests
}

const ok = results.filter((r) => r.status === 'OK');
const notOk = results.filter((r) => r.status !== 'OK');
console.log(`Matched + fetched real dimensions for ${ok.length}/${rows.length} live GPU rows.`);
for (const r of ok) console.log(`  ${r.name.padEnd(50)} ${r.length}×${r.width}×${r.thickness}mm -> slot ${r.slotWidth}`);
if (notOk.length) {
  console.log(`\n${notOk.length} rows could not be matched/fetched:`);
  for (const r of notOk) console.log(`  ${r.status.padEnd(16)} ${r.name}`);
}
console.log(apply ? '\nApplied.' : '\n(dry run — pass --apply to write these values)');
