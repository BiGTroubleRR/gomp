// One-off import: unlike the other import-*-variants scripts, RAM doesn't mirror the existing
// catalog's specs — the curated catalog only had two (32GB DDR5-6400 and 32GB DDR5-5600), which
// is far too narrow a slice of what real DDR5 kits look like. Instead this targets an explicit
// spread of capacity/module-count/speed combos (single 8-32GB sticks, dual-channel kits from
// 16-64GB, speeds from 5200 to 8000) and mines real kits from buildcores-open-db for each,
// preferring named flagship lines (Trident Z, Dominator/Vengeance, Fury, ...) from the top
// manufacturers by SKU volume. New rows get no passmark (RAM has no PassMark score), a tier
// computed from speed/CAS-latency/stick-count (see computeRamTier below), and an estimated price
// interpolated from the two real curated anchor prices.
import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toUpperCase().replace(/[®™]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}

// Mirrors ramTier() in src/lib/passmark.ts — duplicated here because this is a standalone .mjs
// script (no app TS imports), not because the formula differs. Keep in sync if that changes.
const RAM_UNKNOWN_CAS_RATIO = 150;
const RAM_STICK_BONUS = { 1: -8, 2: 0, 4: 8 };
function computeRamTier(speedMhz, casLatency, moduleCount) {
  if (!speedMhz) return null;
  const ratio = casLatency ? speedMhz / casLatency : RAM_UNKNOWN_CAS_RATIO;
  const score = ratio + (RAM_STICK_BONUS[moduleCount] ?? 0);
  if (score >= 200) return 'S';
  if (score >= 170) return 'A';
  if (score >= 140) return 'B';
  if (score >= 110) return 'C';
  return 'D';
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
// across the speed range real DDR5 ships at. The 4-module rows exist specifically so the 8GB and
// 16GB per-stick lines each have a complete 1x/2x/4x spread (32GB=4x8GB, 64GB=4x16GB) for the
// /build stick-count selector — 4-DIMM kits ship at more modest speeds in practice (signal
// integrity across 4 slots), so these are only added at 5600/6000 rather than the full range.
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
  { capacityGb: 32, modules: 4, speed: 5600 },
  { capacityGb: 32, modules: 4, speed: 6000 },
  { capacityGb: 64, modules: 2, speed: 5600 },
  { capacityGb: 64, modules: 2, speed: 6000 },
  { capacityGb: 64, modules: 2, speed: 6400 },
  { capacityGb: 64, modules: 4, speed: 5600 },
  { capacityGb: 64, modules: 4, speed: 6000 },
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
      tier: computeRamTier(target.speed, c.cas_latency, target.modules),
      ram_height_mm: c.height ?? null,
      // Both were previously left unset here, which silently dropped every mined row out of the
      // /build DDR-generation filter and the min-speed slider (they read exactly these two
      // columns) — every candidate in this file is already filtered to ram_type === 'DDR5' above.
      ram_generation: 5,
      ram_speed_mhz: target.speed,
      // Same manufacturer + speed + per-stick capacity = the same real product line at a
      // different stick count (1x/2x/4x) — this is what lets the picker group them into one
      // card. Per-stick capacity (not total kit capacity) is the part that must match: a 1x16GB
      // and a 2x16GB stick are the same product bought in different quantities, but a 1x16GB and
      // a 1x8GB are not, even at the same speed.
      ram_family: `${c.metadata.manufacturer.trim()}|${moduleCapacity}GB|${target.speed}`,
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
