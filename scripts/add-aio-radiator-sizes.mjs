// One-off import: adds real 120mm and 240mm AIO coolers, mined from buildcores-open-db's
// CPUCooler category the same way scripts/import-cooler-variants.mjs already mines size-matched
// air-tower and 360mm AIO variants — the catalog had six different 360mm AIOs but zero 120mm or
// 240mm options, so there was nothing to pick for the two smaller radiator sizes the 3D scene now
// renders (see buildAioRadiatorGroup in src/lib/build-scene.ts, which derives fan count directly
// from cooler_radiator_mm: 1 fan at 120mm, 2 at 240mm, 3 at 360mm).
import { readdirSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OPEN_DB = process.env.BUILDCORES_OPEN_DB_PATH;
if (!OPEN_DB) throw new Error('Set BUILDCORES_OPEN_DB_PATH to the extracted open-db directory');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toUpperCase().replace(/[®™]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}

const dir = `${OPEN_DB}/CPUCooler`;
const candidates = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    try {
      return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    } catch {
      return null;
    }
  })
  .filter((c) => c && c.metadata?.manufacturer && c.metadata?.name);

const { data: existing } = await supabase.from('components').select('name').eq('category', 'cooler');
const existingNames = new Set(existing.map((r) => normalize(r.name)));

// Flat price per size, same convention import-cooler-variants.mjs used for 360mm (every new
// variant borrows one price for its size, no per-model pricing data available) — priced below
// the existing 360mm rows' $156, scaled roughly with radiator size/fan count.
const TARGET = 5;
const SIZES = [
  { radiatorMm: 240, price: 130 },
  { radiatorMm: 120, price: 90 },
];

const results = [];

for (const { radiatorMm, price } of SIZES) {
  const matched = candidates.filter((c) => c.water_cooled === true && c.radiator_size === radiatorMm);

  const chosen = [];
  const seenName = new Set();
  const seenMfr = new Set();
  for (const c of matched) {
    if (chosen.length >= TARGET) break;
    const mfr = c.metadata.manufacturer.trim();
    const nameKey = normalize(c.metadata.name);
    if (existingNames.has(nameKey) || seenName.has(nameKey)) continue;
    if (seenMfr.has(mfr)) continue;
    chosen.push(c);
    seenName.add(nameKey);
    seenMfr.add(mfr);
  }

  console.log(`${radiatorMm}mm: found ${chosen.length}/${TARGET} manufacturers from ${matched.length} candidates`);

  chosen.forEach((c) => {
    results.push({
      category: 'cooler',
      name: c.metadata.name,
      price,
      specs: `${radiatorMm}mm AIO`,
      tier: null,
      cooler_height_mm: null,
      cooler_radiator_mm: radiatorMm,
      sort_order: 100,
    });
  });
}

console.log(`\nTotal new cooler rows to insert: ${results.length}`);
console.log(JSON.stringify(results, null, 2));

if (process.argv.includes('--apply')) {
  const { error } = await supabase.from('components').insert(results);
  if (error) console.error('INSERT FAILED', error.message);
  else console.log(`Inserted ${results.length} rows`);
} else {
  console.log('\n(dry run — pass --apply to actually insert)');
}
