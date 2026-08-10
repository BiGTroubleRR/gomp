// One-off import: unlike the other import-*-variants scripts, RAM doesn't mirror the existing
// catalog's specs — the curated catalog only had two (32GB DDR5-6400 and 32GB DDR5-5600), which
// is far too narrow a slice of what real DDR5 kits look like. Instead this targets an explicit
// spread of capacity/module-count/speed combos (single 8-32GB sticks, dual-channel kits from
// 16-64GB, speeds from 5200 to 8000) and mines real kits from buildcores-open-db for each,
// preferring named flagship lines (Trident Z, Dominator/Vengeance, Fury, ...) from the top
// manufacturers by SKU volume. New rows get no tier/passmark (no PassMark score to derive one
// from) and an estimated price interpolated from the two real curated anchor prices.
import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toUpperCase().replace(/[®™]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}

const ramDir = `${OPEN_DB}/RAM`;
const candidates = readdirSync(ramDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    try {
      return JSON.parse(readFileSync(`${ramDir}/${f}`, 'utf8'));
    } catch {
      return null;
    }
  })
  .filter(
    (c) =>
      c &&
      c.ram_type === 'DDR5' &&
      c.speed &&
      c.capacity &&
      c.modules?.quantity &&
      c.metadata?.manufacturer &&
      c.metadata?.name,
  );

// Anchored to the two real hand-curated prices (32GB@6400=130€, 32GB@5600=112€) — €/GB rises
// with speed, interpolated/extrapolated linearly from those two points.
const PER_GB_AT_5600 = 112 / 32;
const PER_GB_SLOPE = (130 / 32 - PER_GB_AT_5600) / (6400 - 5600);
function estimatePrice(capacityGb, speed, moduleCount) {
  const perGb = PER_GB_AT_5600 + (speed - 5600) * PER_GB_SLOPE;
  const raw = capacityGb * perGb * (moduleCount === 1 ? 0.95 : 1); // single sticks skip the matched-pair binning premium
  return Math.max(15, Math.round(raw));
}

// Top manufacturers by real SKU volume in the dataset, in the priority order picked for each
// spec. Preferred keywords steer toward each brand's flagship line when it has multiple —
// exactly the "Trident Z, Corsair, and more" named-model coverage that was asked for — falling
// back to any SKU from that manufacturer if none of its flagship line matches this exact spec.
const MFR_PRIORITY = [
  { mfr: 'G.SKILL', prefer: ['TRIDENT Z'] },
  { mfr: 'Corsair', prefer: ['DOMINATOR', 'VENGEANCE'] },
  { mfr: 'Kingston', prefer: ['FURY'] },
  { mfr: 'TEAMGROUP', prefer: ['T-FORCE', 'DELTA'] },
  { mfr: 'Crucial', prefer: [] },
  { mfr: 'Patriot', prefer: ['VIPER'] },
  { mfr: 'ADATA', prefer: ['XPG'] },
];

// capacityGb = total kit capacity, modules = stick count (1 = single stick, incl. the "even
// 1x16GB" case explicitly asked for). Spans budget single sticks through high-end 64GB dual kits
// across the speed range real DDR5 ships at.
const TARGET_SPECS = [
  { capacityGb: 8, modules: 1, speed: 5600 },
  { capacityGb: 16, modules: 1, speed: 5200 },
  { capacityGb: 16, modules: 1, speed: 5600 },
  { capacityGb: 16, modules: 1, speed: 6000 },
  { capacityGb: 16, modules: 1, speed: 6400 },
  { capacityGb: 16, modules: 2, speed: 5600 },
  { capacityGb: 16, modules: 2, speed: 6000 },
  { capacityGb: 32, modules: 1, speed: 5600 },
  { capacityGb: 32, modules: 1, speed: 6000 },
  { capacityGb: 32, modules: 2, speed: 5200 },
  { capacityGb: 32, modules: 2, speed: 5600 },
  { capacityGb: 32, modules: 2, speed: 6000 },
  { capacityGb: 32, modules: 2, speed: 6400 },
  { capacityGb: 32, modules: 2, speed: 6800 },
  { capacityGb: 32, modules: 2, speed: 7200 },
  { capacityGb: 32, modules: 2, speed: 8000 },
  { capacityGb: 64, modules: 2, speed: 5600 },
  { capacityGb: 64, modules: 2, speed: 6000 },
  { capacityGb: 64, modules: 2, speed: 6400 },
];

const { data: existing } = await supabase.from('components').select('name').eq('category', 'ram');
const seenName = new Set((existing || []).map((r) => normalize(r.name)));
const results = [];

for (const target of TARGET_SPECS) {
  const matched = candidates.filter(
    (c) => c.speed === target.speed && c.capacity === target.capacityGb && c.modules.quantity === target.modules,
  );

  const chosen = [];
  for (const { mfr, prefer } of MFR_PRIORITY) {
    const fromMfr = matched.filter((c) => c.metadata.manufacturer.trim() === mfr && !seenName.has(normalize(c.metadata.name)));
    if (!fromMfr.length) continue;
    const preferred = prefer.length ? fromMfr.find((c) => prefer.some((kw) => c.metadata.name.toUpperCase().includes(kw))) : null;
    const pick = preferred ?? fromMfr[0];
    chosen.push(pick);
    seenName.add(normalize(pick.metadata.name));
  }

  const label = `${target.capacityGb}GB (${target.modules}x${Math.round(target.capacityGb / target.modules)}GB) DDR5-${target.speed}`;
  console.log(`${label}: found ${chosen.length}/${MFR_PRIORITY.length} manufacturers from ${matched.length} candidates`);

  chosen.forEach((c) => {
    const moduleCapacity = c.modules.capacity_gb ?? Math.round(c.capacity / c.modules.quantity);
    const cl = c.cas_latency ? `CL${c.cas_latency}` : '';
    const specs = `${c.modules.quantity}×${moduleCapacity}GB · ${cl}`.replace(/·\s*$/, '').trim();
    results.push({
      category: 'ram',
      name: c.metadata.name,
      price: estimatePrice(target.capacityGb, target.speed, target.modules),
      specs,
      tier: null,
      ram_height_mm: c.height ?? null,
      sort_order: 100,
    });
  });
}

console.log(`\nTotal new RAM rows to insert: ${results.length}`);
if (process.argv.includes('--full')) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(JSON.stringify(results.slice(0, 5), null, 2));
}

if (process.argv.includes('--apply')) {
  const chunkSize = 50;
  for (let i = 0; i < results.length; i += chunkSize) {
    const chunk = results.slice(i, i + chunkSize);
    const { error } = await supabase.from('components').insert(chunk);
    if (error) console.error('INSERT FAILED for chunk', i, error.message);
    else console.log(`Inserted rows ${i}-${i + chunk.length}`);
  }
} else {
  console.log('\n(dry run — pass --apply to actually insert)');
}
